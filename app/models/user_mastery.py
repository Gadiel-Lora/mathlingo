from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.topic import Topic
    from app.models.user import User


class UserMastery(Base):
    """Tracks a user's mastery score for a specific topic."""

    __tablename__ = 'user_mastery'
    __table_args__ = (
        UniqueConstraint('user_id', 'topic_id', name='uq_user_topic_mastery'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey('topics.id'), nullable=False)
    mastery_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_updated: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Owning user for this mastery record.
    user: Mapped[User] = relationship('User', back_populates='mastery')
    # Topic linked to this mastery record.
    topic: Mapped[Topic] = relationship('Topic', back_populates='mastery')
