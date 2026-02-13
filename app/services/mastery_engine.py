from __future__ import annotations

from datetime import datetime, timedelta
from math import log1p

from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.exercise import Exercise
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.user_mastery import UserMastery

ALPHA_DEFAULT = 0.2
BETA_DEFAULT = 0.1
MIN_DIFFICULTY = 0.1
MAX_DIFFICULTY = 2.0
MIN_CRITICALITY = 1
MAX_CRITICALITY = 3
IN_DEVELOPMENT_MIN = 0.5
INACTIVITY_DAYS = 90
REVALIDATION_CORRECT_REQUIRED = 3
REVALIDATION_WINDOW_DAYS = 30


def _clamp(value: float, min_value: float, max_value: float) -> float:
    """Clamp a numeric value to a closed interval."""
    return max(min_value, min(max_value, value))


def _calculate_effective_rates_with_base(
    topic_mastery: float,
    difficulty: float,
    criticality: int,
    base_alpha: float,
    base_beta: float,
) -> tuple[float, float]:
    """Compute difficulty/criticality-adjusted rates from base alpha/beta."""
    mastery = _clamp(float(topic_mastery), 0.0, 1.0)
    normalized_difficulty = _clamp(float(difficulty), MIN_DIFFICULTY, MAX_DIFFICULTY)
    normalized_criticality = int(_clamp(float(criticality), MIN_CRITICALITY, MAX_CRITICALITY))

    # Keep mastery normalized for predictable numeric behavior.
    _ = mastery
    criticality_factor = log1p(normalized_criticality)

    effective_alpha = _clamp(base_alpha * normalized_difficulty * criticality_factor, 0.0, 1.0)
    effective_beta = _clamp(base_beta * (2.0 - normalized_difficulty) * criticality_factor, 0.0, 1.0)
    return effective_alpha, effective_beta


def calculate_effective_rates(topic_mastery: float, difficulty: float, criticality: int) -> tuple[float, float]:
    """Public helper using default base alpha/beta."""
    return _calculate_effective_rates_with_base(
        topic_mastery=topic_mastery,
        difficulty=difficulty,
        criticality=criticality,
        base_alpha=ALPHA_DEFAULT,
        base_beta=BETA_DEFAULT,
    )


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


def is_inactive(mastery: UserMastery, now: datetime | None = None) -> bool:
    """Return True when no updates in the inactivity window."""
    reference = now or datetime.utcnow()
    delta_days = (reference - mastery.last_updated.replace(tzinfo=None)).days
    return delta_days > INACTIVITY_DAYS


def has_passed_revalidation(
    db: Session,
    user_id: int,
    topic_id: int,
    required_correct: int = REVALIDATION_CORRECT_REQUIRED,
) -> bool:
    """Require a minimum number of recent correct attempts to revalidate a stale topic."""
    cutoff = datetime.utcnow() - timedelta(days=REVALIDATION_WINDOW_DAYS)
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
    """Calculate the new mastery score from the previous score and result."""
    if is_correct:
        return old_score + alpha * (1.0 - old_score)
    return old_score - beta * old_score


def update_mastery(
    db: Session,
    user_id: int,
    topic_id: int,
    is_correct: bool,
    difficulty: float = 1.0,
    criticality_level: int = 1,
    alpha: float = ALPHA_DEFAULT,
    beta: float = BETA_DEFAULT,
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

    effective_alpha, effective_beta = _calculate_effective_rates_with_base(
        topic_mastery=mastery.mastery_score,
        difficulty=difficulty,
        criticality=criticality_level,
        base_alpha=alpha,
        base_beta=beta,
    )
    new_score = calculate_mastery_score(
        mastery.mastery_score,
        is_correct,
        effective_alpha,
        effective_beta,
    )
    mastery.mastery_score = max(0.0, min(1.0, new_score))
    mastery.last_updated = datetime.utcnow()

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
