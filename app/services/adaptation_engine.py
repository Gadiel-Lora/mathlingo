from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.topic import Topic
from app.models.topic_dependency import TopicDependency
from app.services.mastery_engine import get_mastery_map

MASTERY_UNLOCK_THRESHOLD = 0.7


def _dependency_map(db: Session) -> dict[int, list[int]]:
    """Build a map of topic_id to prerequisite topic_ids."""
    dependencies: dict[int, list[int]] = {}
    for dep in db.query(TopicDependency).all():
        dependencies.setdefault(dep.topic_id, []).append(dep.depends_on_id)
    return dependencies


def _is_unlocked(topic_id: int, mastery_map: dict[int, float], deps: dict[int, list[int]]) -> bool:
    """Check if a topic is unlocked based on prerequisite mastery."""
    for prereq_id in deps.get(topic_id, []):
        if mastery_map.get(prereq_id, 0.0) < MASTERY_UNLOCK_THRESHOLD:
            return False
    return True


def select_next_exercise(db: Session, user_id: int) -> Exercise | None:
    """Select the next exercise based on lowest mastery among unlocked topics."""
    topics = db.query(Topic).all()
    if not topics:
        return None

    mastery_map = get_mastery_map(db, user_id)
    deps = _dependency_map(db)

    unlocked_topics = [topic for topic in topics if _is_unlocked(topic.id, mastery_map, deps)]
    if not unlocked_topics:
        unlocked_topics = topics

    unlocked_topics.sort(key=lambda topic: mastery_map.get(topic.id, 0.0))

    for topic in unlocked_topics:
        exercise = (
            db.query(Exercise)
            .filter(Exercise.topic_id == topic.id)
            .order_by(Exercise.id)
            .first()
        )
        if exercise is not None:
            return exercise

    return db.query(Exercise).order_by(Exercise.id).first()
