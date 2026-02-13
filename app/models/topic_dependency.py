from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, UniqueConstraint, event, func, select
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.topic import Topic

if TYPE_CHECKING:
    pass


class TopicDependency(Base):
    """Directed edge in the topic graph (topic -> depends_on)."""

    __tablename__ = 'topic_dependencies'
    __table_args__ = (
        UniqueConstraint('topic_id', 'depends_on_id', name='uq_topic_dependencies_pair'),
        CheckConstraint('topic_id <> depends_on_id', name='ck_topic_dependencies_not_self'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey('topics.id'), nullable=False, index=True)
    depends_on_id: Mapped[int] = mapped_column(Integer, ForeignKey('topics.id'), nullable=False, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    topic: Mapped[Topic] = relationship(
        'Topic',
        foreign_keys=[topic_id],
        back_populates='dependencies',
    )
    depends_on: Mapped[Topic] = relationship(
        'Topic',
        foreign_keys=[depends_on_id],
        back_populates='prerequisite_for',
    )

    def __repr__(self) -> str:
        return f"TopicDependency(id={self.id}, topic_id={self.topic_id}, depends_on_id={self.depends_on_id})"


@event.listens_for(TopicDependency, 'before_insert')
@event.listens_for(TopicDependency, 'before_update')
def validate_same_subject(mapper, connection, target: TopicDependency) -> None:
    """Business rule: dependency edges cannot cross subjects."""
    topic_subject = connection.execute(
        select(Topic.subject_id).where(Topic.id == target.topic_id)
    ).scalar_one_or_none()
    depends_on_subject = connection.execute(
        select(Topic.subject_id).where(Topic.id == target.depends_on_id)
    ).scalar_one_or_none()

    if topic_subject is None or depends_on_subject is None:
        raise ValueError('TopicDependency references non-existent topics')
    if topic_subject != depends_on_subject:
        raise ValueError('TopicDependency must connect topics from the same subject')
