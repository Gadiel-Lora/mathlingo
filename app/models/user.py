from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt
    from app.models.progress import Progress
    from app.models.user_mastery import UserMastery


class User(Base):
    """Application user with progress, mastery, and attempts."""

    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default='user')

    progress: Mapped[list[Progress]] = relationship(
        'Progress',
        back_populates='user',
        cascade='all, delete-orphan',
    )
    mastery: Mapped[list[UserMastery]] = relationship(
        'UserMastery',
        back_populates='user',
        cascade='all, delete-orphan',
    )
    attempts: Mapped[list[Attempt]] = relationship(
        'Attempt',
        back_populates='user',
        cascade='all, delete-orphan',
    )
