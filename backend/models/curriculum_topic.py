from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from backend.core.database import Base

if TYPE_CHECKING:
    from models.curriculum_area import CurriculumArea
    from models.curriculum_lesson import CurriculumLesson


class CurriculumTopic(Base):
    """Topic inside a curriculum area."""

    __tablename__ = 'curriculum_topics'
    __table_args__ = (
        UniqueConstraint('area_id', 'external_id', name='uq_curriculum_topics_area_external_id'),
        Index('ix_curriculum_topics_area_position', 'area_id', 'position'),
        CheckConstraint(
            "problem_mix IN ('contextualized', 'mechanical', 'mixed')",
            name='ck_curriculum_topics_problem_mix',
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    area_id: Mapped[int] = mapped_column(ForeignKey('curriculum_areas.id', ondelete='CASCADE'), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(140), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    subtopics: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    difficulty_range: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    question_count_range: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    problem_mix: Mapped[str] = mapped_column(String(32), nullable=False, default='mixed')
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    area: Mapped[CurriculumArea] = relationship('CurriculumArea', back_populates='topics')
    lessons: Mapped[list[CurriculumLesson]] = relationship(
        'CurriculumLesson',
        back_populates='topic',
        cascade='all, delete-orphan',
        order_by='CurriculumLesson.position',
    )

    def __repr__(self) -> str:
        return f"CurriculumTopic(id={self.id}, area_id={self.area_id}, external_id={self.external_id!r})"
