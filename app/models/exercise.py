from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt
    from app.models.level import Level
    from app.models.topic import Topic


class Exercise(Base):
    """Exercise tied to a topic for adaptive practice."""

    __tablename__ = 'exercises'
    __table_args__ = (
        CheckConstraint('difficulty >= 0.1 AND difficulty <= 2.0', name='ck_exercises_difficulty_range'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey('topics.id'), nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    topic: Mapped[Topic] = relationship('Topic', back_populates='exercises')
    attempts: Mapped[list[Attempt]] = relationship(
        'Attempt',
        back_populates='exercise',
        cascade='all, delete-orphan',
    )

    # Legacy field kept for compatibility with existing level model.
    level_id: Mapped[int | None] = mapped_column(Integer, ForeignKey('levels.id'), nullable=True)
    level: Mapped[Level | None] = relationship('Level', back_populates='exercises')

    def __repr__(self) -> str:
        return f"Exercise(id={self.id}, topic_id={self.topic_id}, difficulty={self.difficulty})"
