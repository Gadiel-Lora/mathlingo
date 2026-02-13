from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt
    from app.models.certificate import Certificate
    from app.models.progress import Progress
    from app.models.user_mastery import UserMastery


class User(Base):
    """Platform user with role, attempts, mastery, and certificates."""

    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default='user')

    attempts: Mapped[list[Attempt]] = relationship(
        'Attempt',
        back_populates='user',
        cascade='all, delete-orphan',
    )
    mastery: Mapped[list[UserMastery]] = relationship(
        'UserMastery',
        back_populates='user',
        cascade='all, delete-orphan',
    )
    certificates: Mapped[list[Certificate]] = relationship(
        'Certificate',
        back_populates='user',
        cascade='all, delete-orphan',
    )

    # Legacy relation kept for compatibility with existing progress endpoints.
    progress: Mapped[list[Progress]] = relationship(
        'Progress',
        back_populates='user',
        cascade='all, delete-orphan',
    )

    def __repr__(self) -> str:
        return f"User(id={self.id}, email={self.email!r}, role={self.role!r})"
