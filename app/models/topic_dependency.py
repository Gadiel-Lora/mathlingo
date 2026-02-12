from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.topic import Topic


class TopicDependency(Base):
    """Represents a prerequisite relationship between two topics."""

    __tablename__ = 'topic_dependencies'
    __table_args__ = (
        UniqueConstraint('topic_id', 'depends_on_id', name='uq_topic_dependency'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey('topics.id'), nullable=False)
    depends_on_id: Mapped[int] = mapped_column(Integer, ForeignKey('topics.id'), nullable=False)

    # The topic that has the dependency.
    topic: Mapped[Topic] = relationship(
        'Topic',
        foreign_keys=[topic_id],
        back_populates='dependencies',
    )
    # The prerequisite topic that must be mastered first.
    prerequisite: Mapped[Topic] = relationship(
        'Topic',
        foreign_keys=[depends_on_id],
        back_populates='prerequisites',
    )
