"""Central SQLAlchemy model registry for metadata initialization."""

from models.attempt import Attempt
from models.certificate import Certificate
from models.curriculum_area import CurriculumArea
from models.curriculum_lesson import CurriculumLesson
from models.curriculum_topic import CurriculumTopic
from models.exercise import Exercise
from models.grade import Grade
from models.level import Level
from models.module import Module
from models.pathway import Pathway
from models.progress import Progress
from models.subject import Subject
from models.topic import Topic
from models.topic_dependency import TopicDependency
from models.user import User
from models.user_mastery import UserMastery

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
