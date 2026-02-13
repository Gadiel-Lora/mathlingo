from __future__ import annotations

import math
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.attempt import Attempt
from app.models.exercise import Exercise
from app.models.module import Module
from app.models.pathway import Pathway
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.topic_dependency import TopicDependency
from app.models.user import User
from app.models.user_mastery import UserMastery
from app.services.adaptation_engine import select_next_exercise
from app.services.certificate_service import ensure_subject_certificate, verify_certificate_hash
from app.services.mastery_engine import (
    calculate_effective_rates,
    get_threshold,
    update_mastery,
)


def _session(tmp_path):
    """Create an isolated DB session for engine tests."""
    db_path = tmp_path / 'engine_tests.db'
    engine = create_engine(
        f'sqlite:///{db_path}',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _create_learning_structure(
    db,
    *,
    threshold_c1: float = 0.65,
    threshold_c2: float = 0.75,
    threshold_c3: float = 0.85,
    certificate_threshold: float = 0.80,
):
    """Create subject/pathway/module records required by topic relations."""
    subject = Subject(
        name=f'Subject-{datetime.utcnow().timestamp()}',
        description='Core topics',
        threshold_c1=threshold_c1,
        threshold_c2=threshold_c2,
        threshold_c3=threshold_c3,
        certificate_threshold=certificate_threshold,
    )
    db.add(subject)
    db.commit()

    pathway = Pathway(subject_id=subject.id, name='Path', description=None, order=1)
    db.add(pathway)
    db.commit()

    module = Module(pathway_id=pathway.id, name='Module 1', order=1)
    db.add(module)
    db.commit()
    return subject, pathway, module


def test_thresholds_per_subject():
    """Threshold helper must resolve by criticality from each subject."""
    base = Subject(
        name='Math',
        threshold_c1=0.6,
        threshold_c2=0.7,
        threshold_c3=0.9,
        certificate_threshold=0.8,
    )
    assert get_threshold(base, 1) == pytest.approx(0.6)
    assert get_threshold(base, 2) == pytest.approx(0.7)
    assert get_threshold(base, 3) == pytest.approx(0.9)
    assert get_threshold(base, 5) == pytest.approx(0.9)


def test_weighted_mastery_update_with_difficulty_and_criticality(tmp_path):
    """Mastery must use weighted alpha/beta rates with clamp-safe values."""
    db = _session(tmp_path)
    subject, _, module = _create_learning_structure(db)

    user = User(email='user@example.com', hashed_password='hash', role='user')
    topic = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Fractions',
        description='Basics',
        difficulty_level=0.6,
        criticality_level=3,
    )
    db.add_all([user, topic])
    db.commit()

    alpha, beta = calculate_effective_rates(topic_mastery=0.0, difficulty=1.7, criticality=3)
    assert alpha == pytest.approx(0.2 * 1.7 * math.log1p(3))
    assert beta == pytest.approx(0.1 * (2.0 - 1.7) * math.log1p(3))

    mastery = update_mastery(
        db=db,
        user_id=user.id,
        topic_id=topic.id,
        is_correct=True,
        difficulty=1.7,
        criticality_level=3,
    )
    assert mastery.mastery_score == pytest.approx(alpha)

    mastery = update_mastery(
        db=db,
        user_id=user.id,
        topic_id=topic.id,
        is_correct=False,
        difficulty=1.7,
        criticality_level=3,
    )
    expected_after_fail = alpha - (beta * alpha)
    assert mastery.mastery_score == pytest.approx(expected_after_fail)


def test_select_next_exercise_prioritizes_weak_and_critical_topic(tmp_path):
    """Adaptive engine should select weak+critical topic and near-target difficulty."""
    db = _session(tmp_path)
    subject, _, module = _create_learning_structure(db)

    user = User(email='learner@example.com', hashed_password='hash', role='user')
    prereq = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Prereq',
        description='Root',
        difficulty_level=0.4,
        criticality_level=1,
    )
    weak_critical = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Weak Critical',
        description='Depends on prereq',
        difficulty_level=0.9,
        criticality_level=3,
    )
    db.add_all([user, prereq, weak_critical])
    db.commit()

    db.add(TopicDependency(topic_id=weak_critical.id, depends_on_id=prereq.id))
    db.add_all(
        [
            Exercise(topic_id=prereq.id, question='P', answer='A', difficulty=0.2),
            Exercise(topic_id=weak_critical.id, question='E1', answer='A1', difficulty=0.3),
            Exercise(topic_id=weak_critical.id, question='E2', answer='A2', difficulty=0.55),
            Exercise(topic_id=weak_critical.id, question='E3', answer='A3', difficulty=1.1),
        ]
    )
    db.commit()

    db.add(UserMastery(user_id=user.id, topic_id=prereq.id, mastery_score=0.9))
    db.add(UserMastery(user_id=user.id, topic_id=weak_critical.id, mastery_score=0.4))
    db.commit()

    next_exercise = select_next_exercise(db, user.id)
    assert next_exercise is not None
    assert next_exercise.topic_id == weak_critical.id
    assert next_exercise.question == 'E2'


def test_dependency_unlock_respects_subject_threshold(tmp_path):
    """Dependent topic must remain blocked until prerequisite reaches threshold."""
    db = _session(tmp_path)
    subject, _, module = _create_learning_structure(db, threshold_c1=0.7)

    user = User(email='unlock@example.com', hashed_password='hash', role='user')
    prereq = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Prereq',
        description='Base',
        difficulty_level=0.4,
        criticality_level=1,
    )
    dependent = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Dependent',
        description='Advanced',
        difficulty_level=0.8,
        criticality_level=2,
    )
    db.add_all([user, prereq, dependent])
    db.commit()
    db.add(TopicDependency(topic_id=dependent.id, depends_on_id=prereq.id))
    db.add_all(
        [
            Exercise(topic_id=prereq.id, question='R1', answer='A', difficulty=0.6),
            Exercise(topic_id=dependent.id, question='D1', answer='A', difficulty=0.9),
        ]
    )
    db.commit()

    db.add(UserMastery(user_id=user.id, topic_id=prereq.id, mastery_score=0.65))
    db.commit()

    next_before = select_next_exercise(db, user.id)
    assert next_before is not None
    assert next_before.topic_id == prereq.id

    mastery = db.query(UserMastery).filter_by(user_id=user.id, topic_id=prereq.id).first()
    assert mastery is not None
    mastery.mastery_score = 0.8
    mastery.last_updated = datetime.utcnow()
    db.commit()

    next_after = select_next_exercise(db, user.id)
    assert next_after is not None
    assert next_after.topic_id == dependent.id


def test_inactivity_requires_revalidation_before_unlock(tmp_path):
    """Inactive prerequisites should lock dependent topics until revalidated."""
    db = _session(tmp_path)
    subject, _, module = _create_learning_structure(db)

    user = User(email='inactive@example.com', hashed_password='hash', role='user')
    prereq = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Old Topic',
        description='Needs revalidation',
        difficulty_level=0.5,
        criticality_level=2,
    )
    dependent = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Blocked Topic',
        description='Should stay blocked first',
        difficulty_level=0.8,
        criticality_level=3,
    )
    db.add_all([user, prereq, dependent])
    db.commit()
    db.add(TopicDependency(topic_id=dependent.id, depends_on_id=prereq.id))

    prereq_exercise = Exercise(topic_id=prereq.id, question='Revalidate', answer='A', difficulty=0.7)
    dependent_exercise = Exercise(topic_id=dependent.id, question='Advanced', answer='A', difficulty=1.0)
    db.add_all([prereq_exercise, dependent_exercise])
    db.commit()

    stale_time = datetime.utcnow() - timedelta(days=95)
    db.add(
        UserMastery(
            user_id=user.id,
            topic_id=prereq.id,
            mastery_score=0.95,
            last_updated=stale_time,
        )
    )
    db.commit()

    next_before = select_next_exercise(db, user.id)
    assert next_before is not None
    assert next_before.topic_id == prereq.id

    db.add_all(
        [
            Attempt(user_id=user.id, exercise_id=prereq_exercise.id, is_correct=True),
            Attempt(user_id=user.id, exercise_id=prereq_exercise.id, is_correct=True),
            Attempt(user_id=user.id, exercise_id=prereq_exercise.id, is_correct=True),
        ]
    )
    db.commit()

    next_after = select_next_exercise(db, user.id)
    assert next_after is not None
    assert next_after.topic_id == dependent.id


def test_certificate_generation_and_public_verification(tmp_path):
    """Certificate should be issued only when subject completion rules are met."""
    db = _session(tmp_path)
    subject, _, module = _create_learning_structure(
        db,
        threshold_c1=0.65,
        threshold_c2=0.75,
        threshold_c3=0.85,
        certificate_threshold=0.8,
    )

    user = User(email='cert@example.com', hashed_password='hash', role='user')
    t1 = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Topic 1',
        description='c1',
        difficulty_level=0.4,
        criticality_level=1,
    )
    t2 = Topic(
        subject_id=subject.id,
        module_id=module.id,
        name='Topic 2',
        description='c3',
        difficulty_level=0.8,
        criticality_level=3,
    )
    db.add_all([user, t1, t2])
    db.commit()

    db.add_all(
        [
            UserMastery(user_id=user.id, topic_id=t1.id, mastery_score=0.9),
            UserMastery(user_id=user.id, topic_id=t2.id, mastery_score=0.9),
        ]
    )
    db.commit()

    cert = ensure_subject_certificate(db, user_id=user.id, subject_id=subject.id)
    assert cert is not None
    assert cert.status == 'valid'
    assert cert.avg_mastery >= subject.certificate_threshold

    verified = verify_certificate_hash(db, cert.verification_hash)
    assert verified is not None
    assert verified.id == cert.id
