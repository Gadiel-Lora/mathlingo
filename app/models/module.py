from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.level import Level
    from app.models.pathway import Pathway
    from app.models.progress import Progress
    from app.models.topic import Topic


class Module(Base):
    """Module groups topics within a pathway."""

    __tablename__ = 'modules'
    __table_args__ = (
        UniqueConstraint('pathway_id', 'name', name='uq_modules_pathway_name'),
        Index('ix_modules_pathway_order', 'pathway_id', 'order'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pathway_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey('pathways.id'),
        nullable=True,
        index=True,
    )
    name: Mapped[str | None] = mapped_column(String(140), nullable=True)
    # Legacy fields kept because current module routes still use title/description.
    title: Mapped[str | None] = mapped_column(String(140), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    pathway: Mapped[Pathway | None] = relationship('Pathway', back_populates='modules')
    topics: Mapped[list[Topic]] = relationship(
        'Topic',
        back_populates='module',
        cascade='all, delete-orphan',
    )

    # Legacy relations kept for compatibility with existing project files.
    levels: Mapped[list[Level]] = relationship(
        'Level',
        back_populates='module',
        cascade='all, delete-orphan',
    )
    progress: Mapped[list[Progress]] = relationship(
        'Progress',
        back_populates='module',
        cascade='all, delete-orphan',
    )

    def __repr__(self) -> str:
        return f"Module(id={self.id}, pathway_id={self.pathway_id}, name={self.name!r})"
