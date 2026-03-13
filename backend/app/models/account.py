from datetime import datetime

from sqlalchemy import DateTime, String, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Account(Base):
    """Mirrors Prisma Account model. Read-only — used to retrieve GitHub access tokens."""

    __tablename__ = "account"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    accountId: Mapped[str] = mapped_column(String)
    providerId: Mapped[str] = mapped_column(String)
    userId: Mapped[str] = mapped_column(String, ForeignKey("user.id", ondelete="CASCADE"))
    accessToken: Mapped[str | None] = mapped_column(String, nullable=True)
    refreshToken: Mapped[str | None] = mapped_column(String, nullable=True)
    idToken: Mapped[str | None] = mapped_column(String, nullable=True)
    accessTokenExpiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    refreshTokenExpiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scope: Mapped[str | None] = mapped_column(String, nullable=True)
    password: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime, onupdate=func.now())

    user = relationship("User", back_populates="accounts")
