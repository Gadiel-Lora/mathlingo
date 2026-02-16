from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.exercise import Exercise
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.user_mastery import UserMastery

BASE_LEARNING_RATE_DEFAULT = 0.2
MIN_DIFFICULTY = 0.1
MAX_DIFFICULTY = 2.0
MIN_CRITICALITY = 1
MAX_CRITICALITY = 3
IN_DEVELOPMENT_MIN = 0.5
TOPIC_COMPLETION_THRESHOLD = 0.8
INACTIVITY_DAYS = 90
REVALIDATION_CORRECT_REQUIRED = 3
REVALIDATION_WINDOW_DAYS = 30
REVIEW_DECAY_WINDOW_DAYS = 30.0


def _clamp(value: float, min_value: float, max_value: float) -> float:
    """Clamp a numeric value to a closed interval."""
    return max(min_value, min(max_value, value))


def _utcnow() -> datetime:
    """Single clock source to keep time behavior consistent."""
    return datetime.utcnow()


def _normalized_last_seen(mastery: UserMastery) -> datetime | None:
    """Read last seen datetime with backward compatibility."""
    last_seen = getattr(mastery, 'last_seen_at', None)
    if last_seen is None:
        last_seen = mastery.last_updated
    if last_seen is None:
        return None
    return last_seen.replace(tzinfo=None)


def calculate_learning_rate(
    base_learning_rate: float,
    difficulty: float,
    criticality: int,
) -> float:
    """Dynamic learning rate weighted by difficulty and criticality."""
    normalized_difficulty = _clamp(float(difficulty), MIN_DIFFICULTY, MAX_DIFFICULTY)
    normalized_criticality = int(_clamp(float(criticality), MIN_CRITICALITY, MAX_CRITICALITY))
    rate = base_learning_rate * normalized_difficulty * (1.0 + normalized_criticality * 0.1)
    return _clamp(rate, 0.001, 1.0)


def calculate_effective_rates(topic_mastery: float, difficulty: float, criticality: int) -> tuple[float, float]:
    """Backward-compatible helper returning the dynamic learning rate tuple."""
    _ = _clamp(float(topic_mastery), 0.0, 1.0)
    learning_rate = calculate_learning_rate(
        base_learning_rate=BASE_LEARNING_RATE_DEFAULT,
        difficulty=difficulty,
        criticality=criticality,
    )
    return learning_rate, learning_rate


def get_threshold(subject: Subject, criticality: int) -> float:
    """Return mastery threshold by subject and criticality bucket."""
    if criticality >= 3:
        return float(subject.threshold_c3)
    if criticality == 2:
        return float(subject.threshold_c2)
    return float(subject.threshold_c1)


def is_topic_dominated(subject: Subject, criticality: int, mastery_score: float) -> bool:
    """Check if a topic mastery score satisfies its threshold."""
    return float(mastery_score) >= get_threshold(subject, criticality)


def is_topic_in_development(subject: Subject, criticality: int, mastery_score: float) -> bool:
    """A topic is in development when score is [0.5, threshold)."""
    threshold = get_threshold(subject, criticality)
    score = float(mastery_score)
    return IN_DEVELOPMENT_MIN <= score < threshold


def is_topic_completed(mastery_score: float, completion_threshold: float = TOPIC_COMPLETION_THRESHOLD) -> bool:
    """Check if topic mastery reached completion threshold."""
    return float(mastery_score) >= float(completion_threshold)


def is_inactive(mastery: UserMastery, now: datetime | None = None) -> bool:
    """Return True when no updates in the inactivity window."""
    last_seen = _normalized_last_seen(mastery)
    if last_seen is None:
        return True
    reference = (now or _utcnow()).replace(tzinfo=None)
    delta_days = (reference - last_seen).days
    return delta_days > INACTIVITY_DAYS


def calculate_decay_factor(last_seen_at: datetime | None, now: datetime | None = None) -> float:
    """Increase decay as elapsed days grow since last exposure."""
    if last_seen_at is None:
        return 1.0
    reference = (now or _utcnow()).replace(tzinfo=None)
    last_seen = last_seen_at.replace(tzinfo=None)
    elapsed_days = max(0.0, (reference - last_seen).total_seconds() / 86400.0)
    return _clamp(elapsed_days / REVIEW_DECAY_WINDOW_DAYS, 0.0, 1.0)


def calculate_review_priority(
    mastery_score: float,
    last_seen_at: datetime | None,
    now: datetime | None = None,
) -> float:
    """Spaced repetition priority: lower mastery and older topics rise first."""
    score = _clamp(float(mastery_score), 0.0, 1.0)
    decay_factor = calculate_decay_factor(last_seen_at, now=now)
    return (1.0 - score) + decay_factor


def has_passed_revalidation(
    db: Session,
    user_id: int,
    topic_id: int,
    required_correct: int = REVALIDATION_CORRECT_REQUIRED,
) -> bool:
    """Require a minimum number of recent correct attempts to revalidate a stale topic."""
    cutoff = _utcnow() - timedelta(days=REVALIDATION_WINDOW_DAYS)
    rows = (
        db.query(Attempt)
        .join(Exercise, Exercise.id == Attempt.exercise_id)
        .filter(
            Attempt.user_id == user_id,
            Exercise.topic_id == topic_id,
            Attempt.is_correct.is_(True),
            Attempt.created_at >= cutoff,
        )
        .count()
    )
    return rows >= required_correct


def calculate_mastery_score(old_score: float, is_correct: bool, alpha: float, beta: float) -> float:
    """Logistic-style mastery update with directional delta."""
    _ = beta  # kept for backward compatibility in function signature
    score = _clamp(float(old_score), 0.0, 1.0)
    learning_rate = _clamp(float(alpha), 0.0, 1.0)
    if is_correct:
        delta = learning_rate * (1.0 - score)
    else:
        delta = -learning_rate * score
    return _clamp(score + delta, 0.0, 1.0)


def _set_repetition_metadata(mastery: UserMastery, now: datetime) -> None:
    """Update spaced-repetition tracking fields if available on the model."""
    # Backward compatibility: legacy schema always has last_updated.
    mastery.last_updated = now

    # Optional schema fields: only set when present in the mapped model.
    if hasattr(mastery, 'last_seen_at'):
        setattr(mastery, 'last_seen_at', now)

    review_priority = calculate_review_priority(
        mastery_score=float(mastery.mastery_score),
        last_seen_at=now,
        now=now,
    )
    if hasattr(mastery, 'review_priority'):
        setattr(mastery, 'review_priority', review_priority)
    else:
        # Useful runtime attribute even before DB migration.
        setattr(mastery, '_runtime_review_priority', review_priority)

    setattr(mastery, 'is_completed', is_topic_completed(float(mastery.mastery_score)))


def update_mastery(
    db: Session,
    user_id: int,
    topic_id: int,
    is_correct: bool,
    difficulty: float = 1.0,
    criticality_level: int = 1,
    alpha: float = BASE_LEARNING_RATE_DEFAULT,
    beta: float = BASE_LEARNING_RATE_DEFAULT,
) -> UserMastery:
    """Create or update a mastery record for a user and topic."""
    mastery = (
        db.query(UserMastery)
        .filter(UserMastery.user_id == user_id, UserMastery.topic_id == topic_id)
        .first()
    )

    if mastery is None:
        mastery = UserMastery(user_id=user_id, topic_id=topic_id, mastery_score=0.0)
        db.add(mastery)
        db.flush()

    learning_rate = calculate_learning_rate(
        base_learning_rate=alpha,
        difficulty=difficulty,
        criticality=criticality_level,
    )
    new_score = calculate_mastery_score(
        mastery.mastery_score,
        is_correct,
        learning_rate,
        beta,
    )
    mastery.mastery_score = _clamp(new_score, 0.0, 1.0)
    _set_repetition_metadata(mastery, now=_utcnow())

    db.commit()
    db.refresh(mastery)
    return mastery


def get_user_mastery(db: Session, user_id: int) -> list[UserMastery]:
    """Return mastery records for the specified user."""
    return db.query(UserMastery).filter(UserMastery.user_id == user_id).all()


def get_mastery_map(db: Session, user_id: int) -> dict[int, float]:
    """Return a mapping of topic_id to mastery score for the user."""
    return {row.topic_id: row.mastery_score for row in get_user_mastery(db, user_id)}


def get_mastery_row(db: Session, user_id: int, topic_id: int) -> UserMastery | None:
    """Return a single mastery row for user/topic when available."""
    return (
        db.query(UserMastery)
        .filter(UserMastery.user_id == user_id, UserMastery.topic_id == topic_id)
        .first()
    )


def get_topic_review_priority(db: Session, user_id: int, topic_id: int) -> float:
    """Read review priority for a topic, with fallback if schema is not migrated yet."""
    mastery = get_mastery_row(db, user_id=user_id, topic_id=topic_id)
    if mastery is None:
        return calculate_review_priority(mastery_score=0.0, last_seen_at=None, now=_utcnow())

    persisted_priority = getattr(mastery, 'review_priority', None)
    if persisted_priority is not None:
        return float(persisted_priority)

    runtime_priority = getattr(mastery, '_runtime_review_priority', None)
    if runtime_priority is not None:
        return float(runtime_priority)

    return calculate_review_priority(
        mastery_score=float(mastery.mastery_score),
        last_seen_at=_normalized_last_seen(mastery),
        now=_utcnow(),
    )


def is_topic_ready_for_unlock(db: Session, user_id: int, topic: Topic) -> bool:
    """Topic is ready when dominated, not in mandatory reinforcement, and revalidated if stale."""
    mastery = get_mastery_row(db, user_id, topic.id)
    if mastery is None:
        return False

    score = float(mastery.mastery_score)
    if not is_topic_dominated(topic.subject, int(topic.criticality_level), score):
        return False
    if is_topic_in_development(topic.subject, int(topic.criticality_level), score):
        return False
    if is_inactive(mastery) and not has_passed_revalidation(db, user_id=user_id, topic_id=topic.id):
        return False
    return True
