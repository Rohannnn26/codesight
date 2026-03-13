import asyncio
import time
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import review_graph
from app.agents.state import ReviewSettings, ReviewState
from app.celery_app import celery_app
from app.database import async_session
from app.models.pull_request import PullRequest
from app.models.repository import Repository
from app.models.review import Review, ReviewStatus
from app.services.token_service import get_github_token_for_repo

logger = structlog.get_logger()


# ── Async helpers (run inside asyncio.run()) ────────────────────────────────


async def _load_review_context(review_id: str) -> dict:
    """Load all DB records needed to build the initial ReviewState."""
    async with async_session() as db:
        # Load Review
        result = await db.execute(select(Review).where(Review.id == review_id))
        review = result.scalar_one_or_none()
        if not review:
            raise ValueError(f"Review {review_id} not found in database.")

        # Load PullRequest
        result = await db.execute(
            select(PullRequest).where(PullRequest.id == review.pullRequestId)
        )
        pr = result.scalar_one_or_none()
        if not pr:
            raise ValueError(f"PullRequest for review {review_id} not found.")

        # Load Repository
        result = await db.execute(
            select(Repository).where(Repository.id == pr.repositoryId)
        )
        repo = result.scalar_one_or_none()
        if not repo:
            raise ValueError(f"Repository for PR {pr.id} not found.")

        # Get GitHub access token
        token = await get_github_token_for_repo(db, repo.id)
        if not token:
            raise ValueError(f"No GitHub token found for repository {repo.fullName}.")

        return {
            "review_id": review.id,
            "pr_id": pr.id,
            "repo_id": repo.id,
            "pr_number": pr.number,
            "pr_title": pr.title,
            "pr_body": pr.body or "",
            "pr_author": pr.author,
            "base_sha": pr.baseBranch,   # stored as branch name; diff_fetcher re-fetches SHAs
            "head_sha": pr.headSha,
            "repository_full_name": repo.fullName,
            "github_token": token,
        }


async def _set_review_in_progress(review_id: str) -> None:
    async with async_session() as db:
        result = await db.execute(select(Review).where(Review.id == review_id))
        review = result.scalar_one_or_none()
        if review:
            review.status = ReviewStatus.in_progress
            await db.commit()


async def _save_review_success(review_id: str, final_state: ReviewState) -> None:
    async with async_session() as db:
        result = await db.execute(select(Review).where(Review.id == review_id))
        review = result.scalar_one_or_none()
        if review:
            review.status = ReviewStatus.completed
            review.summary = final_state.get("summary", "")
            review.body = final_state.get("review_body", "")
            review.state = final_state.get("overall_risk", "LOW")
            if final_state.get("github_review_id"):
                review.githubprId = int(final_state["github_review_id"])
            await db.commit()


async def _save_review_failure(review_id: str, error: str) -> None:
    async with async_session() as db:
        result = await db.execute(select(Review).where(Review.id == review_id))
        review = result.scalar_one_or_none()
        if review:
            review.status = ReviewStatus.failed
            review.body = f"Review failed: {error}"
            await db.commit()


# ── Celery task ─────────────────────────────────────────────────────────────


@celery_app.task(
    bind=True,
    name="app.tasks.trigger_review",
    max_retries=3,
    default_retry_delay=60,
)
def trigger_review(self, review_id: str) -> dict:
    """Celery task: run the full LangGraph AI review pipeline for one PR.

    Flow:
      1. Load Review, PullRequest, Repository from DB
      2. Get GitHub OAuth token for the repo owner
      3. Mark Review as IN_PROGRESS
      4. Build initial ReviewState
      5. Run review_graph.invoke(state) — executes all 9 pipeline nodes
      6. On success: save summary/body/risk to DB, mark COMPLETED
      7. On failure: save error, mark FAILED, retry up to 3 times

    This is a synchronous Celery task. All async DB operations are
    wrapped in asyncio.run() calls.
    """
    logger.info("trigger_review_started", review_id=review_id)
    start_ms = int(time.time() * 1000)

    try:
        # ── Step 1: Load context from DB ─────────────────────────────────
        context = asyncio.run(_load_review_context(review_id))
        logger.info("review_context_loaded", repo=context["repository_full_name"], pr=context["pr_number"])

        # ── Step 2: Mark as in-progress ──────────────────────────────────
        asyncio.run(_set_review_in_progress(review_id))

        # ── Step 3: Build initial ReviewState ────────────────────────────
        initial_state: ReviewState = {
            # Input
            "pull_request_id": context["pr_id"],
            "review_id": review_id,
            "repository_full_name": context["repository_full_name"],
            "pr_number": context["pr_number"],
            "github_token": context["github_token"],
            "base_sha": context["base_sha"],
            "head_sha": context["head_sha"],
            "pr_title": context["pr_title"],
            "pr_body": context["pr_body"],
            "pr_author": context["pr_author"],
            "review_settings": ReviewSettings(),

            # Pipeline fields — empty, filled by nodes
            "raw_files_json": "",
            "parsed_files": [],
            "filtered_files": [],
            "skipped_files": [],
            "file_reviews": [],
            "security_findings": [],
            "complexity_scores": {},
            "overall_risk": "LOW",
            "summary": "",
            "walkthrough": "",
            "formatted_comments": [],
            "review_body": "",
            "github_review_id": None,
            "error": None,
            "model_used": "gpt-4o",
            "token_usage": {},
            "duration_ms": 0,
        }

        # ── Step 4: Run the LangGraph pipeline ───────────────────────────
        logger.info("langgraph_pipeline_starting", review_id=review_id)
        final_state: ReviewState = review_graph.invoke(initial_state)
        duration_ms = int(time.time() * 1000) - start_ms
        logger.info(
            "langgraph_pipeline_complete",
            review_id=review_id,
            duration_ms=duration_ms,
            overall_risk=final_state.get("overall_risk"),
            inline_comments=len(final_state.get("formatted_comments") or []),
        )

        # ── Step 5: Persist results ───────────────────────────────────────
        if final_state.get("error"):
            # Pipeline completed but github_poster failed — still save what we have
            asyncio.run(_save_review_failure(review_id, final_state["error"]))
            return {"review_id": review_id, "status": "failed", "error": final_state["error"]}

        asyncio.run(_save_review_success(review_id, final_state))
        logger.info("review_saved", review_id=review_id, status="completed")
        return {"review_id": review_id, "status": "completed", "duration_ms": duration_ms}

    except Exception as exc:
        logger.error("trigger_review_failed", review_id=review_id, error=str(exc))
        asyncio.run(_save_review_failure(review_id, str(exc)))

        # Retry with exponential backoff on transient failures
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
