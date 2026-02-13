from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.user import User


class Attempt(Base):
    """Immutable record of a user attempt on an exercise."""

    __tablename__ = 'attempts'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey('exercises.id'), nullable=False, index=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship('User', back_populates='attempts')
    exercise: Mapped[Exercise] = relationship('Exercise', back_populates='attempts')

    def __repr__(self) -> str:
        return (
            f"Attempt(id={self.id}, user_id={self.user_id}, "
            f"exercise_id={self.exercise_id}, is_correct={self.is_correct})"
        )
