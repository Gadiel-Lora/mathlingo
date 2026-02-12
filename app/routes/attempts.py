from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.attempt import Attempt
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.attempt import AttemptCreate, AttemptOut
from app.services.mastery_engine import update_mastery

router = APIRouter(prefix='/attempts', tags=['Attempts'])


@router.post('/', response_model=AttemptOut)
def create_attempt(data: AttemptCreate, db: Session = Depends(get_db)):
    """Store an attempt and update mastery for the related topic."""
    user = db.query(User).filter(User.id == data.user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    exercise = db.query(Exercise).filter(Exercise.id == data.exercise_id).first()
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Exercise not found')

    if exercise.topic_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Exercise has no topic assigned',
        )

    attempt = Attempt(
        user_id=data.user_id,
        exercise_id=data.exercise_id,
        is_correct=data.is_correct,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    topic_id = cast(int, exercise.topic_id)
    mastery = update_mastery(db, data.user_id, topic_id, data.is_correct)

    return AttemptOut(
        id=attempt.id,
        user_id=attempt.user_id,
        exercise_id=attempt.exercise_id,
        is_correct=attempt.is_correct,
        created_at=attempt.created_at,
        mastery_score=mastery.mastery_score,
    )
