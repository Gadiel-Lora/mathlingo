"""Central SQLAlchemy model registry for metadata initialization."""

from .attempt import Attempt
from .certificate import Certificate
from .curriculum_area import CurriculumArea
from .curriculum_lesson import CurriculumLesson
from .curriculum_topic import CurriculumTopic
from .exercise import Exercise
from .grade import Grade
from .level import Level
from .module import Module
from .pathway import Pathway
from .progress import Progress
from .subject import Subject
from .topic import Topic
from .topic_dependency import TopicDependency
from .user import User
from .user_mastery import UserMastery

__all__ = [
    'Attempt',
    'Certificate',
    'CurriculumArea',
    'CurriculumLesson',
    'CurriculumTopic',
    'Exercise',
    'Grade',
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
