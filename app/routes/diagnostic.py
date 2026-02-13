from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.topic import Topic
from app.schemas.diagnostic import BranchLevelOut
from app.services.diagnostic_engine import calculate_branch_level

router = APIRouter(prefix='/diagnostic', tags=['Diagnostic'])


@router.get('/branch_level', response_model=BranchLevelOut)
def get_branch_level(
    user_id: int,
    topic_ids: list[int] | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Return a coarse branch level based on average mastery."""
    if topic_ids is None:
        resolved_topic_ids = [topic.id for topic in db.query(Topic).all()]
    else:
        resolved_topic_ids = topic_ids

    level = calculate_branch_level(db, user_id=user_id, topic_ids=resolved_topic_ids)
    return BranchLevelOut(user_id=user_id, topic_ids=resolved_topic_ids, branch_level=level)
