"""Central SQLAlchemy model registry for metadata initialization."""

from app.models.attempt import Attempt
from app.models.certificate import Certificate
from app.models.exercise import Exercise
from app.models.level import Level
from app.models.module import Module
from app.models.pathway import Pathway
from app.models.progress import Progress
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.topic_dependency import TopicDependency
from app.models.user import User
from app.models.user_mastery import UserMastery

__all__ = [
    'Attempt',
    'Certificate',
    'Exercise',
    'Level',
    'Module',
    'Pathway',
    'Progress',
    'Subject',
    'Topic',
    'TopicDependency',
    'User',
    'UserMastery',
]
