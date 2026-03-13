import httpx
import structlog

logger = structlog.get_logger()

GITHUB_API_BASE = "https://api.github.com"


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def fetch_pr_files(token: str, owner: str, repo: str, pr_number: int) -> list[dict]:
    """Fetch list of changed files with patches for a PR (handles pagination)."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/files"
    all_files: list[dict] = []
    page = 1

    with httpx.Client(timeout=30.0) as client:
        while True:
            response = client.get(
                url, headers=_headers(token), params={"per_page": 100, "page": page}
            )
            response.raise_for_status()
            files = response.json()
            if not files:
                break
            all_files.extend(files)
            if len(files) < 100:
                break
            page += 1

    logger.info("pr_files_fetched", owner=owner, repo=repo, pr=pr_number, count=len(all_files))
    return all_files


def fetch_pr_details(token: str, owner: str, repo: str, pr_number: int) -> dict:
    """Fetch PR metadata (title, body, author, base/head SHA, etc.)."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}"
    with httpx.Client(timeout=30.0) as client:
        response = client.get(url, headers=_headers(token))
        response.raise_for_status()
        return response.json()


def post_review(
    token: str,
    owner: str,
    repo: str,
    pr_number: int,
    body: str,
    comments: list[dict],
    event: str = "COMMENT",
) -> dict:
    """Create a pull request review with an optional set of inline comments.

    Args:
        token: GitHub access token.
        owner: Repository owner.
        repo: Repository name.
        pr_number: PR number.
        body: Markdown body for the top-level review comment.
        comments: List of inline comment dicts with keys: path, line, side, body.
        event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES". We always use COMMENT.

    Returns:
        The created review object from GitHub.
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
    payload = {"body": body, "event": event, "comments": comments}

    with httpx.Client(timeout=60.0) as client:
        response = client.post(url, headers=_headers(token), json=payload)
        response.raise_for_status()
        result = response.json()

    logger.info(
        "review_posted",
        owner=owner,
        repo=repo,
        pr=pr_number,
        review_id=result.get("id"),
        inline_comments=len(comments),
    )
    return result


def post_comment(token: str, owner: str, repo: str, pr_number: int, body: str) -> dict:
    """Post a standalone comment on the PR issue thread (for errors/status)."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{pr_number}/comments"
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, headers=_headers(token), json={"body": body})
        response.raise_for_status()
        return response.json()
