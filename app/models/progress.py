from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.module import Module
    from app.models.user import User


class Progress(Base):
    __tablename__ = 'progress'
    __table_args__ = (
        UniqueConstraint('user_id', 'module_id', name='uq_progress_user_module'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey('modules.id'), nullable=False)
    xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    user: Mapped['User'] = relationship('User', back_populates='progress')
    module: Mapped['Module'] = relationship('Module', back_populates='progress')
