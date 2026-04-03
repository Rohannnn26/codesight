import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, String, Text, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"


class Review(Base):
    """Mirrors Prisma review model."""

    __tablename__ = "review"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    githubprId: Mapped[int] = mapped_column(BigInteger)  # GitHub PR ID, not unique per review
    status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus, name="ReviewStatus", create_type=False)
    )
    summary: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text)
    pullRequestId: Mapped[str] = mapped_column(
        String, ForeignKey("pull_request.id", ondelete="CASCADE")
    )
    createdAt: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), server_default=func.now()
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), server_default=func.now(), onupdate=func.now()
    )

    pullRequest = relationship("PullRequest", back_populates="reviews")
