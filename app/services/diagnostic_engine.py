from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.topic import Topic
from app.services.mastery_engine import get_mastery_map


def calculate_branch_level(db: Session, user_id: int, topic_ids: list[int] | None = None) -> int:
    """Compute a coarse level for a branch based on average mastery."""
    if topic_ids is None:
        topic_ids = [topic.id for topic in db.query(Topic).all()]

    if not topic_ids:
        return 0

    mastery_map = get_mastery_map(db, user_id)
    average = sum(mastery_map.get(topic_id, 0.0) for topic_id in topic_ids) / len(topic_ids)

    if average >= 0.8:
        return 3
    if average >= 0.5:
        return 2
    if average >= 0.2:
        return 1
    return 0
