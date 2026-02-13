from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.topic import Topic
from app.models.topic_dependency import TopicDependency
from app.schemas.topic import TopicOut

router = APIRouter(prefix='/topics', tags=['Topics'])


@router.get('/', response_model=list[TopicOut])
def list_topics(db: Session = Depends(get_db)):
    """Return all topics with their prerequisite ids."""
    topics = db.query(Topic).all()
    dependencies = db.query(TopicDependency).all()

    dep_map: dict[int, list[int]] = {}
    for dep in dependencies:
        dep_map.setdefault(dep.topic_id, []).append(dep.depends_on_id)

    return [
        TopicOut(
            id=topic.id,
            name=topic.name,
            description=topic.description,
            level=int(round(float(topic.difficulty_level))),
            prerequisites=dep_map.get(topic.id, []),
        )
        for topic in topics
    ]
