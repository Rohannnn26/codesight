import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, Integer, String, Text, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PullRequestState(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    MERGED = "MERGED"


class PullRequest(Base):
    """Mirrors Prisma PullRequest model."""

    __tablename__ = "pull_request"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    githubId: Mapped[int] = mapped_column(BigInteger, unique=True)
    number: Mapped[int] = mapped_column(Integer)
    state: Mapped[PullRequestState] = mapped_column(
        Enum(PullRequestState, name="PullRequestState", create_type=False)
    )
    title: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(String)
    author: Mapped[str] = mapped_column(String)
    baseBranch: Mapped[str] = mapped_column(String)
    headBranch: Mapped[str] = mapped_column(String)
    headSha: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    repositoryId: Mapped[str] = mapped_column(
        String, ForeignKey("repository.id", ondelete="CASCADE")
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    repository = relationship("Repository", back_populates="pullRequests")
    reviews = relationship("Review", back_populates="pullRequest")
