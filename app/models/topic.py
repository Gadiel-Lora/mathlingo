from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.topic_dependency import TopicDependency
    from app.models.user_mastery import UserMastery


class Topic(Base):
    """Knowledge graph topic that can depend on other topics."""

    __tablename__ = 'topics'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Dependencies where this topic requires other topics.
    dependencies: Mapped[list[TopicDependency]] = relationship(
        'TopicDependency',
        foreign_keys='TopicDependency.topic_id',
        back_populates='topic',
        cascade='all, delete-orphan',
    )
    # Dependencies where this topic is a prerequisite.
    prerequisites: Mapped[list[TopicDependency]] = relationship(
        'TopicDependency',
        foreign_keys='TopicDependency.depends_on_id',
        back_populates='prerequisite',
    )
    # Exercises linked to this topic.
    exercises: Mapped[list[Exercise]] = relationship(
        'Exercise',
        back_populates='topic',
        cascade='all, delete-orphan',
    )
    # Mastery records for users on this topic.
    mastery: Mapped[list[UserMastery]] = relationship(
        'UserMastery',
        back_populates='topic',
        cascade='all, delete-orphan',
    )
