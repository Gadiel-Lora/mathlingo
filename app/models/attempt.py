from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.user import User


class Attempt(Base):
    """Stores a user attempt on an exercise with correctness."""

    __tablename__ = 'attempts'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey('exercises.id'), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # User who made the attempt.
    user: Mapped[User] = relationship('User', back_populates='attempts')
    # Exercise that was attempted.
    exercise: Mapped[Exercise] = relationship('Exercise', back_populates='attempts')
