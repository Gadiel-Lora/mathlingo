from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt
    from app.models.level import Level
    from app.models.topic import Topic


class Exercise(Base):
    """Represents an exercise that can be linked to a topic and level."""

    __tablename__ = 'exercises'

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)

    level_id = Column(Integer, ForeignKey('levels.id'), nullable=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=True)

    # Relationship to the Level that owns this exercise.
    level = relationship('Level', back_populates='exercises')
    # Optional relationship to the adaptive Topic.
    topic = relationship('Topic', back_populates='exercises')
    # Attempts made by users for this exercise.
    attempts = relationship('Attempt', back_populates='exercise', cascade='all, delete-orphan')
