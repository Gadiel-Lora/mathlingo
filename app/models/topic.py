from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, SmallInteger, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.module import Module
    from app.models.subject import Subject
    from app.models.topic_dependency import TopicDependency
    from app.models.user_mastery import UserMastery


class Topic(Base):
    """Knowledge-graph node tied to a module and subject."""

    __tablename__ = 'topics'
    __table_args__ = (
        UniqueConstraint('subject_id', 'name', name='uq_topics_subject_name'),
        Index('ix_topics_subject_name', 'subject_id', 'name'),
        CheckConstraint('criticality_level BETWEEN 1 AND 3', name='ck_topics_criticality_range'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey('subjects.id'), nullable=False, index=True)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey('modules.id'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty_level: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    criticality_level: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    subject: Mapped[Subject] = relationship('Subject', back_populates='topics')
    module: Mapped[Module] = relationship('Module', back_populates='topics')

    dependencies: Mapped[list[TopicDependency]] = relationship(
        'TopicDependency',
        foreign_keys='TopicDependency.topic_id',
        back_populates='topic',
        cascade='all, delete-orphan',
    )
    prerequisite_for: Mapped[list[TopicDependency]] = relationship(
        'TopicDependency',
        foreign_keys='TopicDependency.depends_on_id',
        back_populates='depends_on',
    )

    exercises: Mapped[list[Exercise]] = relationship(
        'Exercise',
        back_populates='topic',
        cascade='all, delete-orphan',
    )
    mastery: Mapped[list[UserMastery]] = relationship(
        'UserMastery',
        back_populates='topic',
        cascade='all, delete-orphan',
    )

    def __repr__(self) -> str:
        return f"Topic(id={self.id}, subject_id={self.subject_id}, name={self.name!r})"
