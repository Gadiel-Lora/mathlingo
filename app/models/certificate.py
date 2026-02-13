from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.subject import Subject
    from app.models.user import User


class Certificate(Base):
    """Certificate issued after finishing a pathway/subject goal."""

    __tablename__ = 'certificates'
    __table_args__ = (
        CheckConstraint('avg_mastery >= 0.0 AND avg_mastery <= 1.0', name='ck_certificates_avg_mastery_range'),
        CheckConstraint("status IN ('valid', 'revoked', 'expired')", name='ck_certificates_status'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey('subjects.id'), nullable=False, index=True)
    avg_mastery: Mapped[float] = mapped_column(Float, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    verification_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='valid')
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship('User', back_populates='certificates')
    subject: Mapped[Subject] = relationship('Subject', back_populates='certificates')

    def __repr__(self) -> str:
        return (
            f"Certificate(id={self.id}, user_id={self.user_id}, "
            f"subject_id={self.subject_id}, status={self.status!r})"
        )
