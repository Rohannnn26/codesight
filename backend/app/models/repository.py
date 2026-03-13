from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Repository(Base):
    """Mirrors Prisma Repository model."""

    __tablename__ = "repository"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    githubId: Mapped[int] = mapped_column(BigInteger, unique=True)
    name: Mapped[str] = mapped_column(String)
    owner: Mapped[str] = mapped_column(String)
    fullName: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    userId: Mapped[str] = mapped_column(String, ForeignKey("user.id", ondelete="CASCADE"))
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime, onupdate=func.now())

    user = relationship("User", back_populates="repositories")
    pullRequests = relationship("PullRequest", back_populates="repository")
