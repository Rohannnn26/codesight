import structlog

from app.agents.state import ReviewState
from app.services.github_service import post_comment, post_review

logger = structlog.get_logger()


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

    review_body = state.get("review_body", "## 🔍 CodeSight Review\n\n_Review completed._")
    inline_comments = state.get("formatted_comments") or []

    # Convert FormattedComment dataclasses → GitHub API dicts
    github_comments = []
    for c in inline_comments:
        comment: dict = {
            "path": c.path,
            "line": c.line,
            "side": "RIGHT",   # RIGHT = new version of the file (added lines)
            "body": c.body,
        }
        if c.start_line and c.start_line != c.line:
            comment["start_line"] = c.start_line
            comment["start_side"] = "RIGHT"
        github_comments.append(comment)

    logger.info(
        "github_poster_start",
        repo=repo,
        pr=pr_number,
        inline_comments=len(github_comments),
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
