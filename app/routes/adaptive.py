from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.exercise import ExerciseSuggestion
from app.services.adaptation_engine import select_next_exercise

router = APIRouter(tags=['Adaptive'])


@router.get('/next_exercise/', response_model=ExerciseSuggestion)
def get_next_exercise(user_id: int, db: Session = Depends(get_db)):
    """Suggest the next exercise based on adaptive mastery logic."""
    exercise = select_next_exercise(db, user_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='No exercise available')

    return ExerciseSuggestion(
        id=exercise.id,
        question=exercise.question,
        topic_id=exercise.topic_id,
        level_id=exercise.level_id,
    )
