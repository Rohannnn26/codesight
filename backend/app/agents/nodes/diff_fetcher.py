import json
import structlog

from app.agents.state import ReviewState
from app.services.github_service import fetch_pr_files, fetch_pr_details

logger = structlog.get_logger()


def diff_fetcher(state: ReviewState) -> dict:
    """Node 1: Fetch PR files and metadata from GitHub API.

    Calls:
      - GET /repos/{owner}/{repo}/pulls/{pr_number}/files (list of changed files with patches)
      - GET /repos/{owner}/{repo}/pulls/{pr_number} (PR metadata: title, body, author, SHAs)

    Stores raw GitHub API responses as JSON string in state["raw_files_json"].
    Also backfills pr_title, pr_body, pr_author, base_sha, head_sha if not already set.
    """
    logger.info("diff_fetcher_start", repo=state["repository_full_name"], pr=state["pr_number"])

    owner, repo = state["repository_full_name"].split("/", 1)
    token = state["github_token"]
    pr_number = state["pr_number"]

    # Fetch the list of changed files (with patches)
    files = fetch_pr_files(token, owner, repo, pr_number)

    # Fetch PR details to get accurate title/body/author/SHAs
    pr_details = fetch_pr_details(token, owner, repo, pr_number)

    updates: dict = {
        "raw_files_json": json.dumps(files),
        "pr_title": pr_details.get("title", state.get("pr_title", "")),
        "pr_body": pr_details.get("body") or "",
        "pr_author": pr_details.get("user", {}).get("login", state.get("pr_author", "unknown")),
        "base_sha": pr_details.get("base", {}).get("sha", state.get("base_sha", "")),
        "head_sha": pr_details.get("head", {}).get("sha", state.get("head_sha", "")),
    }

    logger.info("diff_fetcher_done", files=len(files))
    return updates
