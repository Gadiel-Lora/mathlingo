from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from backend.core.database import Base

if TYPE_CHECKING:
    from models.curriculum_area import CurriculumArea


class Grade(Base):
    """Academic grade with nested curriculum data."""

    __tablename__ = 'grades'

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    grade_number: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    level_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_exam: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    areas: Mapped[list[CurriculumArea]] = relationship(
        'CurriculumArea',
        back_populates='grade',
        cascade='all, delete-orphan',
        order_by='CurriculumArea.position',
    )

    def __repr__(self) -> str:
        return f"Grade(id={self.id!r}, grade_number={self.grade_number}, name={self.name!r})"
