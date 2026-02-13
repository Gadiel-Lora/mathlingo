from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.topic import Topic
    from app.models.user import User


class UserMastery(Base):
    """Mastery score per user/topic in [0.0, 1.0]."""

    __tablename__ = 'user_mastery'
    __table_args__ = (
        UniqueConstraint('user_id', 'topic_id', name='uq_user_mastery_user_topic'),
        CheckConstraint('mastery_score >= 0.0 AND mastery_score <= 1.0', name='ck_user_mastery_score_range'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey('topics.id'), nullable=False, index=True)
    mastery_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship('User', back_populates='mastery')
    topic: Mapped[Topic] = relationship('Topic', back_populates='mastery')

    def __repr__(self) -> str:
        return (
            f"UserMastery(id={self.id}, user_id={self.user_id}, "
            f"topic_id={self.topic_id}, mastery_score={self.mastery_score:.3f})"
        )
