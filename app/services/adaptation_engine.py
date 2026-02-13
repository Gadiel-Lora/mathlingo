from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.topic import Topic
from app.models.topic_dependency import TopicDependency
from app.services.mastery_engine import (
    get_mastery_map,
    get_mastery_row,
    get_threshold,
    has_passed_revalidation,
    is_inactive,
    is_topic_in_development,
    is_topic_ready_for_unlock,
)

MIN_DIFFICULTY = 0.1
MAX_DIFFICULTY = 2.0
TARGET_DIFFICULTY_GAP = 0.15


def _dependency_map(db: Session) -> dict[int, list[int]]:
    """Build a map of topic_id to prerequisite topic_ids."""
    dependencies: dict[int, list[int]] = {}
    for dep in db.query(TopicDependency).all():
        dependencies.setdefault(dep.topic_id, []).append(dep.depends_on_id)
    return dependencies


def _is_unlocked_with_thresholds(
    db: Session,
    user_id: int,
    topic: Topic,
    deps: dict[int, list[int]],
) -> bool:
    """Dependencies are unlocked only if each prerequisite is ready for unlock."""
    for prereq_id in deps.get(topic.id, []):
        prereq_topic = db.query(Topic).filter(Topic.id == prereq_id).first()
        if prereq_topic is None:
            return False
        if not is_topic_ready_for_unlock(db, user_id=user_id, topic=prereq_topic):
            return False
    return True


def _clamp(value: float, min_value: float, max_value: float) -> float:
    """Clamp a numeric value to a closed interval."""
    return max(min_value, min(max_value, value))


def _topic_priority(topic: Topic, mastery_map: dict[int, float]) -> tuple[float, float, int]:
    """Higher score means higher priority (weaker + more critical)."""
    mastery = _clamp(float(mastery_map.get(topic.id, 0.0)), 0.0, 1.0)
    criticality = max(1, int(getattr(topic, 'criticality_level', 1) or 1))
    threshold = get_threshold(topic.subject, criticality)
    weakness = max(0.0, threshold - mastery)
    weighted_weakness = weakness * criticality
    return weighted_weakness, weakness, criticality


def _pick_exercise_for_topic(db: Session, topic: Topic, mastery_map: dict[int, float]) -> Exercise | None:
    """Choose an exercise slightly above the user's mastery for a topic."""
    topic_mastery = _clamp(float(mastery_map.get(topic.id, 0.0)), 0.0, 1.0)
    target_difficulty = _clamp(topic_mastery + TARGET_DIFFICULTY_GAP, MIN_DIFFICULTY, MAX_DIFFICULTY)

    exercises = db.query(Exercise).filter(Exercise.topic_id == topic.id).all()
    if not exercises:
        return None

    def score(exercise: Exercise) -> tuple[float, float, float, int]:
        difficulty = _clamp(float(getattr(exercise, 'difficulty', 1.0) or 1.0), MIN_DIFFICULTY, MAX_DIFFICULTY)
        below_penalty = max(0.0, target_difficulty - difficulty)
        proximity = abs(difficulty - target_difficulty)
        return (below_penalty, proximity, -difficulty, int(exercise.id))

    return min(exercises, key=score)


def _mandatory_reinforcement_topics(
    db: Session,
    user_id: int,
    topics: list[Topic],
    mastery_map: dict[int, float],
) -> list[Topic]:
    """Return topics that must be reinforced before unlocking dependent topics.

    Reinforcement is mandatory for:
    - Topics in development range [0.5, threshold)
    - Topics that became stale and still need revalidation attempts
    """
    reinforcement: list[Topic] = []
    for topic in topics:
        score = float(mastery_map.get(topic.id, 0.0))
        in_development = is_topic_in_development(
            subject=topic.subject,
            criticality=int(topic.criticality_level),
            mastery_score=score,
        )

        stale_needs_revalidation = False
        mastery = get_mastery_row(db, user_id=user_id, topic_id=topic.id)
        if mastery is not None and is_inactive(mastery, now=datetime.utcnow()):
            stale_needs_revalidation = not has_passed_revalidation(
                db,
                user_id=user_id,
                topic_id=topic.id,
            )

        if in_development or stale_needs_revalidation:
            reinforcement.append(topic)
    return reinforcement


def select_next_exercise(db: Session, user_id: int) -> Exercise | None:
    """Select next exercise using weakness, criticality, and difficulty targeting."""
    topics = db.query(Topic).all()
    if not topics:
        return None

    mastery_map = get_mastery_map(db, user_id)
    deps = _dependency_map(db)

    unlocked_topics = [
        topic
        for topic in topics
        if _is_unlocked_with_thresholds(db, user_id=user_id, topic=topic, deps=deps)
    ]
    if not unlocked_topics:
        unlocked_topics = topics

    reinforcement_topics = _mandatory_reinforcement_topics(
        db,
        user_id=user_id,
        topics=unlocked_topics,
        mastery_map=mastery_map,
    )
    candidate_topics = reinforcement_topics if reinforcement_topics else unlocked_topics

    candidate_topics.sort(
        key=lambda topic: (
            -_topic_priority(topic, mastery_map)[0],
            -_topic_priority(topic, mastery_map)[1],
            -_topic_priority(topic, mastery_map)[2],
            int(topic.id),
        )
    )

    for topic in candidate_topics:
        exercise = _pick_exercise_for_topic(db, topic, mastery_map)
        if exercise is not None:
            return exercise

    return db.query(Exercise).order_by(Exercise.id).first()
