from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from models.curriculum_topic import CurriculumTopic
    from models.grade import Grade


class CurriculumArea(Base):
    """Area or unit group inside a grade."""

    __tablename__ = 'curriculum_areas'
    __table_args__ = (
        UniqueConstraint('grade_id', 'external_id', name='uq_curriculum_areas_grade_external_id'),
        Index('ix_curriculum_areas_branch_id', 'branch_id'),
        Index('ix_curriculum_areas_grade_position', 'grade_id', 'position'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grade_id: Mapped[str] = mapped_column(ForeignKey('grades.id', ondelete='CASCADE'), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    branch_id: Mapped[str] = mapped_column(String(120), nullable=False)
    branch_name: Mapped[str] = mapped_column(String(180), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    grade: Mapped[Grade] = relationship('Grade', back_populates='areas')
    topics: Mapped[list[CurriculumTopic]] = relationship(
        'CurriculumTopic',
        back_populates='area',
        cascade='all, delete-orphan',
        order_by='CurriculumTopic.position',
    )

    def __repr__(self) -> str:
        return f"CurriculumArea(id={self.id}, grade_id={self.grade_id!r}, external_id={self.external_id!r})"
