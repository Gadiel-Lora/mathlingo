from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.module import Module
    from app.models.subject import Subject


class Pathway(Base):
    """Ordered pathway inside a subject."""

    __tablename__ = 'pathways'
    __table_args__ = (
        UniqueConstraint('subject_id', 'name', name='uq_pathways_subject_name'),
        Index('ix_pathways_subject_order', 'subject_id', 'order'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey('subjects.id'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    subject: Mapped[Subject] = relationship('Subject', back_populates='pathways')
    modules: Mapped[list[Module]] = relationship(
        'Module',
        back_populates='pathway',
        cascade='all, delete-orphan',
    )

    def __repr__(self) -> str:
        return f"Pathway(id={self.id}, subject_id={self.subject_id}, name={self.name!r})"
