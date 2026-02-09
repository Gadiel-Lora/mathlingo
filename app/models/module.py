from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Module(Base):
    __tablename__ = 'modules'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    levels = relationship(
        'Level',
        back_populates='module',
        cascade='all, delete-orphan',
    )

    progress = relationship(
        'Progress',
        back_populates='module',
        cascade='all, delete-orphan',
    )
