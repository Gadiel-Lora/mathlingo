from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.user_mastery import UserMastery

ALPHA_DEFAULT = 0.2
BETA_DEFAULT = 0.1


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

    new_score = calculate_mastery_score(mastery.mastery_score, is_correct, alpha, beta)
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
