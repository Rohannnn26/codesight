import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.review import Review, ReviewStatus
from app.schemas.review import ReviewStatusResponse, ReviewRetryResponse
from app.tasks.review_task import trigger_review

logger = structlog.get_logger()

router = APIRouter(prefix="/api/reviews")


@router.get("/{review_id}", response_model=ReviewStatusResponse)
async def get_review_status(review_id: str, db: AsyncSession = Depends(get_db)):
    """Get the status of a code review."""
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    return ReviewStatusResponse(
        id=review.id,
        status=review.status.value,
        summary=review.summary or None,
        createdAt=review.createdAt,
    )


@router.post("/{review_id}/retry", response_model=ReviewRetryResponse)
async def retry_review(review_id: str, db: AsyncSession = Depends(get_db)):
    """Retry a failed code review."""
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.status not in (ReviewStatus.failed, ReviewStatus.skipped):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry review with status: {review.status.value}",
        )

    # Reset status to pending and re-dispatch
    review.status = ReviewStatus.pending
    review.summary = ""
    review.body = ""
    await db.flush()

    trigger_review.delay(review.id)

    logger.info("review_retry_dispatched", review_id=review.id)

    return ReviewRetryResponse(
        id=review.id,
        status="pending",
        message="Review has been re-queued for processing",
    )
