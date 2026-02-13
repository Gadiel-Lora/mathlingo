from __future__ import annotations

import secrets

from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.user_mastery import UserMastery
from app.services.mastery_engine import (
    get_threshold,
    has_passed_revalidation,
    is_inactive,
)


def _normalized_criticality(raw: int) -> int:
    """Clamp criticality values to the expected [1, 3] range."""
    return max(1, min(3, int(raw)))


def _build_unique_certificate_hash(db: Session) -> str:
    """Create a unique certificate hash safe for public verification."""
    while True:
        candidate = secrets.token_hex(32)
        existing = (
            db.query(Certificate)
            .filter(Certificate.verification_hash == candidate)
            .first()
        )
        if existing is None:
            return candidate


def _subject_topics(db: Session, subject_id: int) -> list[Topic]:
    """Return all topics in a subject ordered by id for deterministic behavior."""
    return (
        db.query(Topic)
        .filter(Topic.subject_id == subject_id)
        .order_by(Topic.id.asc())
        .all()
    )


def _subject_mastery_rows(db: Session, user_id: int, subject_id: int) -> dict[int, UserMastery]:
    """Return user mastery rows keyed by topic_id for the selected subject."""
    rows = (
        db.query(UserMastery)
        .join(Topic, Topic.id == UserMastery.topic_id)
        .filter(
            UserMastery.user_id == user_id,
            Topic.subject_id == subject_id,
        )
        .all()
    )
    return {row.topic_id: row for row in rows}


def calculate_weighted_subject_mastery(db: Session, user_id: int, subject_id: int) -> float:
    """Compute weighted average mastery by topic criticality for a subject."""
    topics = _subject_topics(db, subject_id)
    if not topics:
        return 0.0

    mastery_by_topic = _subject_mastery_rows(db, user_id, subject_id)
    weighted_sum = 0.0
    total_weight = 0

    for topic in topics:
        criticality = _normalized_criticality(topic.criticality_level)
        mastery_row = mastery_by_topic.get(topic.id)
        score = float(mastery_row.mastery_score) if mastery_row is not None else 0.0
        weighted_sum += score * criticality
        total_weight += criticality

    if total_weight == 0:
        return 0.0
    return weighted_sum / total_weight


def is_subject_completed(db: Session, user_id: int, subject: Subject) -> tuple[bool, float]:
    """Check if all topics are dominated and weighted mastery reaches certificate threshold."""
    topics = _subject_topics(db, subject.id)
    if not topics:
        return False, 0.0

    mastery_by_topic = _subject_mastery_rows(db, user_id, subject.id)

    weighted_sum = 0.0
    total_weight = 0
    for topic in topics:
        criticality = _normalized_criticality(topic.criticality_level)
        threshold = get_threshold(subject, criticality)
        mastery_row = mastery_by_topic.get(topic.id)
        score = float(mastery_row.mastery_score) if mastery_row is not None else 0.0

        if score < threshold:
            return False, 0.0

        if mastery_row is None:
            return False, 0.0
        if is_inactive(mastery_row) and not has_passed_revalidation(
            db,
            user_id=user_id,
            topic_id=topic.id,
        ):
            return False, 0.0

        weighted_sum += score * criticality
        total_weight += criticality

    if total_weight == 0:
        return False, 0.0

    weighted_average = weighted_sum / total_weight
    if weighted_average < float(subject.certificate_threshold):
        return False, weighted_average
    return True, weighted_average


def ensure_subject_certificate(db: Session, user_id: int, subject_id: int) -> Certificate | None:
    """Issue a certificate when a subject is completed and no valid one exists."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if subject is None:
        return None

    existing = (
        db.query(Certificate)
        .filter(
            Certificate.user_id == user_id,
            Certificate.subject_id == subject_id,
            Certificate.status == 'valid',
        )
        .first()
    )
    if existing is not None:
        return existing

    completed, weighted_average = is_subject_completed(db, user_id=user_id, subject=subject)
    if not completed:
        return None

    certificate = Certificate(
        user_id=user_id,
        subject_id=subject_id,
        avg_mastery=weighted_average,
        verification_hash=_build_unique_certificate_hash(db),
        status='valid',
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    return certificate


def verify_certificate_hash(db: Session, certificate_hash: str) -> Certificate | None:
    """Resolve a certificate by its public verification hash."""
    return (
        db.query(Certificate)
        .filter(Certificate.verification_hash == certificate_hash)
        .first()
    )
