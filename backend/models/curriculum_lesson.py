from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from core.database import Base

if TYPE_CHECKING:
    from models.curriculum_topic import CurriculumTopic


class CurriculumLesson(Base):
    """Lesson inside a curriculum topic."""

    __tablename__ = 'curriculum_lessons'
    __table_args__ = (
        UniqueConstraint('topic_id', 'external_id', name='uq_curriculum_lessons_topic_external_id'),
        Index('ix_curriculum_lessons_topic_position', 'topic_id', 'position'),
        CheckConstraint(
            "lesson_type IN ('practice', 'exam')",
            name='ck_curriculum_lessons_type',
        ),
        CheckConstraint(
            "problem_mix IN ('contextualized', 'mechanical', 'mixed')",
            name='ck_curriculum_lessons_problem_mix',
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey('curriculum_topics.id', ondelete='CASCADE'), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(160), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    lesson_type: Mapped[str] = mapped_column(String(32), nullable=False, default='practice')
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    xp_reward: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    problem_mix: Mapped[str] = mapped_column(String(32), nullable=False, default='mixed')
    subtopics: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    skills: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    topic: Mapped[CurriculumTopic] = relationship('CurriculumTopic', back_populates='lessons')

    def __repr__(self) -> str:
        return f"CurriculumLesson(id={self.id}, topic_id={self.topic_id}, external_id={self.external_id!r})"
