from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.certificate import Certificate
    from app.models.pathway import Pathway
    from app.models.topic import Topic


class Subject(Base):
    """Top-level subject such as Math, Physics, or Programming."""

    __tablename__ = 'subjects'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    threshold_c1: Mapped[float] = mapped_column(Float, nullable=False, default=0.65)
    threshold_c2: Mapped[float] = mapped_column(Float, nullable=False, default=0.75)
    threshold_c3: Mapped[float] = mapped_column(Float, nullable=False, default=0.85)
    certificate_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=0.80)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    pathways: Mapped[list[Pathway]] = relationship(
        'Pathway',
        back_populates='subject',
        cascade='all, delete-orphan',
    )
    topics: Mapped[list[Topic]] = relationship(
        'Topic',
        back_populates='subject',
        cascade='all, delete-orphan',
    )
    certificates: Mapped[list[Certificate]] = relationship(
        'Certificate',
        back_populates='subject',
        cascade='all, delete-orphan',
    )

    def __repr__(self) -> str:
        return f"Subject(id={self.id}, name={self.name!r})"
