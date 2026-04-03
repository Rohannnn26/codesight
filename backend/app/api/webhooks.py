import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.pull_request import PullRequest, PullRequestState
from app.models.repository import Repository
from app.models.review import Review, ReviewStatus
from app.schemas.webhook import PullRequestEvent
from app.tasks.review_task import trigger_review
from app.utils.id_gen import generate_cuid
from app.utils.webhook_verify import verify_webhook_signature

logger = structlog.get_logger()

router = APIRouter(prefix="/api/webhooks")


@router.post("/github")
async def github_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive and process GitHub webhook events."""
    raw_body = await request.body()
    event_type = request.headers.get("x-github-event")
    signature = request.headers.get("x-hub-signature-256", "")

    # Verify webhook signature if secret is configured
    if settings.GITHUB_WEBHOOK_SECRET:
        if not verify_webhook_signature(raw_body, signature, settings.GITHUB_WEBHOOK_SECRET):
            logger.warning("webhook_signature_invalid")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()

    logger.info("webhook_received", event_type=event_type, repo=payload.get("repository", {}).get("full_name"))

    if event_type == "ping":
        return {"message": "pong"}

    if event_type == "pull_request":
        return await _handle_pull_request_event(payload, db)

    if event_type == "push":
        # TODO (future): Trigger RAG re-indexing on push
        logger.info("push_event_received", ref=payload.get("ref"))
        return {"ignored": True, "reason": "push events not yet implemented"}

    return {"ignored": True, "reason": f"unhandled event: {event_type}"}


async def _handle_pull_request_event(payload: dict, db: AsyncSession):
    """Handle pull_request webhook events."""
    event = PullRequestEvent(**payload)
    action = event.action

    logger.info(
        "pr_event",
        action=action,
        pr_number=event.number,
        repo=event.repository.full_name,
    )

    # Only process opened, synchronize (new push), and reopened events
    if action not in ("opened", "synchronize", "reopened"):
        if action == "closed":
            await _handle_pr_closed(event, db)
            return {"processed": True, "action": "closed"}
        return {"ignored": True, "reason": f"unhandled action: {action}"}

    # Look up the repository in our database
    result = await db.execute(
        select(Repository).where(Repository.githubId == event.repository.id)
    )
    repo = result.scalar_one_or_none()

    if not repo:
        logger.warning("repo_not_found", github_id=event.repository.id)
        return {"ignored": True, "reason": "repository not connected"}

    # Upsert PullRequest record
    pr_data = event.pull_request
    result = await db.execute(
        select(PullRequest).where(PullRequest.githubId == pr_data.id)
    )
    pr = result.scalar_one_or_none()

    if pr:
        pr.state = PullRequestState(pr_data.state.upper()) if pr_data.state.upper() in PullRequestState.__members__ else PullRequestState.OPEN
        pr.title = pr_data.title
        pr.body = pr_data.body or ""
        pr.headSha = pr_data.head.get("sha", "")
        pr.headBranch = pr_data.head.get("ref", "")
        pr.baseBranch = pr_data.base.get("ref", "")
    else:
        pr = PullRequest(
            id=generate_cuid(),
            githubId=pr_data.id,
            number=pr_data.number,
            state=PullRequestState.OPEN,
            title=pr_data.title,
            body=pr_data.body or "",
            author=pr_data.user.get("login", "unknown"),
            baseBranch=pr_data.base.get("ref", ""),
            headBranch=pr_data.head.get("ref", ""),
            headSha=pr_data.head.get("sha", ""),
            url=pr_data.html_url,
            repositoryId=repo.id,
        )
        db.add(pr)

    await db.flush()

    # Create a Review record with PENDING status
    review = Review(
        id=generate_cuid(),
        githubprId=pr_data.id,
        status=ReviewStatus.pending,
        summary="",
        state="pending",
        body="",
        pullRequestId=pr.id,
    )
    db.add(review)
    await db.flush()

    # Dispatch Celery task
    trigger_review.delay(review.id)

    logger.info(
        "review_dispatched",
        review_id=review.id,
        pr_number=event.number,
        repo=event.repository.full_name,
    )

    return {"processed": True, "review_id": review.id, "status": "pending"}


async def _handle_pr_closed(event: PullRequestEvent, db: AsyncSession):
    """Update PR state when it's closed or merged."""
    pr_data = event.pull_request
    result = await db.execute(
        select(PullRequest).where(PullRequest.githubId == pr_data.id)
    )
    pr = result.scalar_one_or_none()

    if pr:
        merged = pr_data.state == "closed" and pr_data.base.get("repo", {}).get("id") is not None
        pr.state = PullRequestState.MERGED if "merged" in event.action else PullRequestState.CLOSED
        logger.info("pr_closed", pr_id=pr.id, state=pr.state.value)
