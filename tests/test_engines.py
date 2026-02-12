import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.exercise import Exercise
from app.models.topic import Topic
from app.models.topic_dependency import TopicDependency
from app.models.user import User
from app.models.user_mastery import UserMastery
from app.services.adaptation_engine import select_next_exercise
from app.services.diagnostic_engine import calculate_branch_level
from app.services.mastery_engine import update_mastery


def _session(tmp_path):
    """Create an isolated session backed by a temporary SQLite database."""
    db_path = tmp_path / 'engine_tests.db'
    engine = create_engine(
        f'sqlite:///{db_path}',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_mastery_updates_correctly(tmp_path):
    """Ensure mastery increases on correct answers and decreases on incorrect ones."""
    db = _session(tmp_path)
    user = User(email='user@example.com', hashed_password='hash', role='user')
    topic = Topic(name='Fractions', description='Basics', level=1)
    db.add_all([user, topic])
    db.commit()

    mastery = update_mastery(db, user.id, topic.id, True, alpha=0.2, beta=0.1)
    assert mastery.mastery_score == pytest.approx(0.2)

    mastery = update_mastery(db, user.id, topic.id, False, alpha=0.2, beta=0.1)
    assert mastery.mastery_score == pytest.approx(0.18)


def test_select_next_exercise(tmp_path):
    """Pick the lowest-mastery unlocked topic for the next exercise."""
    db = _session(tmp_path)
    user = User(email='user@example.com', hashed_password='hash', role='user')
    topic_a = Topic(name='Basics', description='Root', level=1)
    topic_b = Topic(name='Advanced', description='Depends', level=2)
    db.add_all([user, topic_a, topic_b])
    db.commit()

    dependency = TopicDependency(topic_id=topic_b.id, depends_on_id=topic_a.id)
    db.add(dependency)
    db.commit()

    exercise_a = Exercise(question='Q1', answer='A1', level_id=1, topic_id=topic_a.id)
    exercise_b = Exercise(question='Q2', answer='A2', level_id=1, topic_id=topic_b.id)
    db.add_all([exercise_a, exercise_b])
    db.commit()

    db.add(UserMastery(user_id=user.id, topic_id=topic_a.id, mastery_score=0.9))
    db.add(UserMastery(user_id=user.id, topic_id=topic_b.id, mastery_score=0.2))
    db.commit()

    next_exercise = select_next_exercise(db, user.id)
    assert next_exercise is not None
    assert next_exercise.topic_id == topic_b.id


def test_calculate_branch_level(tmp_path):
    """Compute a simple branch level from average mastery."""
    db = _session(tmp_path)
    user = User(email='user@example.com', hashed_password='hash', role='user')
    topics = [
        Topic(name='A', description='A', level=1),
        Topic(name='B', description='B', level=1),
        Topic(name='C', description='C', level=1),
    ]
    db.add(user)
    db.add_all(topics)
    db.commit()

    db.add(UserMastery(user_id=user.id, topic_id=topics[0].id, mastery_score=0.9))
    db.add(UserMastery(user_id=user.id, topic_id=topics[1].id, mastery_score=0.8))
    db.add(UserMastery(user_id=user.id, topic_id=topics[2].id, mastery_score=0.7))
    db.commit()

    level = calculate_branch_level(db, user.id)
    assert level == 3
