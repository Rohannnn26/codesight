import re
import structlog

from app.agents.state import ReviewState
from app.services.github_service import post_comment, post_review

logger = structlog.get_logger()


def _extract_valid_lines_from_patch(patch: str) -> set[int]:
    """Extract the set of valid 'new file' line numbers from a unified diff patch.

    GitHub PR Review API only accepts comments on lines that appear in the diff.
    This parses the @@ hunk headers to find which lines are actually in the diff.

    Example hunk header: @@ -10,5 +12,8 @@
    This means: new file starts at line 12, with 8 lines visible in the hunk.
    """
    valid_lines: set[int] = set()

    if not patch:
        return valid_lines

    # Match hunk headers: @@ -old_start,old_count +new_start,new_count @@
    hunk_pattern = re.compile(r'@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@')

    lines = patch.split('\n')
    current_line = 0
    in_hunk = False

    for line in lines:
        hunk_match = hunk_pattern.match(line)
        if hunk_match:
            # Start of a new hunk
            current_line = int(hunk_match.group(1))
            in_hunk = True
            continue

        if not in_hunk:
            continue

        if line.startswith('-'):
            # Deleted line - doesn't count toward new file line numbers
            continue
        elif line.startswith('+'):
            # Added line - valid for comments
            valid_lines.add(current_line)
            current_line += 1
        elif line.startswith(' '):
            # Context line - valid for comments
            valid_lines.add(current_line)
            current_line += 1
        elif line.startswith('\\'):
            # "\ No newline at end of file" - skip
            continue
        else:
            # Other content (possibly end of hunk or malformed)
            if line.strip():
                current_line += 1

    return valid_lines


def github_poster(state: ReviewState) -> dict:
    """Node 9 (final): Post the AI review to GitHub as a Pull Request Review.

    Calls the GitHub PR Review API:
      POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews

    With:
      - body: the full markdown review_body (summary + walkthrough + stats)
      - event: "COMMENT" (never APPROVE or REQUEST_CHANGES — bot doesn't block merges)
      - comments: list of inline comment objects (path + line + side + body)

    Saves the returned GitHub review ID to state["github_review_id"].
    On failure, posts a plain error comment and sets state["error"].
    """
    token = state["github_token"]
    repo = state["repository_full_name"]
    pr_number = state["pr_number"]
    owner, repo_name = repo.split("/", 1)
    filtered_files = state.get("filtered_files", [])

    review_body = state.get("review_body", "## 🔍 CodeSight Review\n\n_Review completed._")
    inline_comments = state.get("formatted_comments") or []

    # Build a map of filename -> valid line numbers from the diff patches
    valid_lines_by_file: dict[str, set[int]] = {}
    for f in filtered_files:
        valid_lines_by_file[f.filename] = _extract_valid_lines_from_patch(f.patch)

    # Convert FormattedComment dataclasses → GitHub API dicts
    # Filter out comments that reference lines not in the diff
    github_comments = []
    filtered_out_count = 0

    for c in inline_comments:
        valid_lines = valid_lines_by_file.get(c.path, set())

        # Check if this line is valid for commenting
        if c.line not in valid_lines:
            # Try to find a nearby valid line (within 3 lines)
            nearby_line = None
            for offset in range(1, 4):
                if (c.line + offset) in valid_lines:
                    nearby_line = c.line + offset
                    break
                if (c.line - offset) in valid_lines:
                    nearby_line = c.line - offset
                    break

            if nearby_line:
                # Use the nearby valid line
                adjusted_line = nearby_line
            else:
                # No valid line nearby - skip this comment
                filtered_out_count += 1
                logger.debug(
                    "comment_filtered_out",
                    path=c.path,
                    line=c.line,
                    reason="line_not_in_diff",
                )
                continue
        else:
            adjusted_line = c.line

        comment: dict = {
            "path": c.path,
            "line": adjusted_line,
            "side": "RIGHT",   # RIGHT = new version of the file (added lines)
            "body": c.body,
        }
        if c.start_line and c.start_line != adjusted_line:
            # Multi-line comments also need valid start_line
            if c.start_line in valid_lines:
                comment["start_line"] = c.start_line
                comment["start_side"] = "RIGHT"
        github_comments.append(comment)

    logger.info(
        "github_poster_start",
        repo=repo,
        pr=pr_number,
        inline_comments=len(github_comments),
        filtered_out=filtered_out_count,
    )

    try:
        result = post_review(
            token=token,
            owner=owner,
            repo=repo_name,
            pr_number=pr_number,
            body=review_body,
            comments=github_comments,
            event="COMMENT",
        )

        github_review_id = result.get("id")
        logger.info("github_poster_done", review_id=github_review_id)
        return {"github_review_id": github_review_id}

    except Exception as exc:
        logger.error("github_poster_failed", error=str(exc))

        # Post a plain error comment so the developer knows the review failed
        try:
            post_comment(
                token=token,
                owner=owner,
                repo=repo_name,
                pr_number=pr_number,
                body=(
                    "## 🔍 CodeSight Review\n\n"
                    f"⚠️ The automated review could not be posted as a formal review due to an error:\n\n"
                    f"```\n{exc}\n```\n\n"
                    "_Please check the CodeSight dashboard for details._"
                ),
            )
        except Exception:
            pass  # If even the fallback fails, the Celery task handles the DB update

        return {"error": str(exc)}
