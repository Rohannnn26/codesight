from datetime import datetime

from sqlalchemy import DateTime, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    """Mirrors Prisma User model. Read-only from backend perspective."""

    __tablename__ = "user"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True)
    emailVerified: Mapped[bool] = mapped_column(Boolean, default=False)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime, onupdate=func.now())

    accounts = relationship("Account", back_populates="user")
    repositories = relationship("Repository", back_populates="user")
