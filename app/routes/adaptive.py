from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.attempt import Attempt
from app.models.exercise import Exercise
from app.models.topic import Topic
from app.models.user import User
from app.schemas.exercise import ExerciseSuggestion
from app.services.adaptation_engine import select_next_exercise
from app.services.mastery_engine import update_mastery

router = APIRouter(prefix='/adaptive', tags=['Adaptive'])


class AdaptiveSubmitRequest(BaseModel):
    user_id: int
    exercise_id: int
    answer: str


class AdaptiveSubmitResponse(BaseModel):
    correct: bool
    correct_answer: str
    mastery_score: float
    next_exercise_id: int | None = None


def _normalize_answer(value: str) -> str:
    return ' '.join(value.strip().lower().split())


@router.get('/next_exercise', response_model=ExerciseSuggestion)
def get_next_exercise(user_id: int, db: Session = Depends(get_db)):
    """Suggest the next exercise based on adaptive mastery logic."""
    exercise = select_next_exercise(db, user_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='No exercise available')

    return ExerciseSuggestion.model_validate(exercise)


@router.post('/submit', response_model=AdaptiveSubmitResponse)
def submit_adaptive_answer(data: AdaptiveSubmitRequest, db: Session = Depends(get_db)):
    """Validate a submitted answer, persist attempt, and update topic mastery."""
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

    topic = db.query(Topic).filter(Topic.id == exercise.topic_id).first()
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Topic not found')

    is_correct = _normalize_answer(data.answer) == _normalize_answer(exercise.answer)

    attempt = Attempt(
        user_id=data.user_id,
        exercise_id=data.exercise_id,
        is_correct=is_correct,
    )
    db.add(attempt)

    mastery = update_mastery(
        db=db,
        user_id=data.user_id,
        topic_id=int(exercise.topic_id),
        is_correct=is_correct,
        difficulty=float(exercise.difficulty),
        criticality_level=int(topic.criticality_level),
    )
    db.refresh(attempt)

    next_exercise = select_next_exercise(db, data.user_id)
    return AdaptiveSubmitResponse(
        correct=is_correct,
        correct_answer=exercise.answer,
        mastery_score=float(mastery.mastery_score),
        next_exercise_id=next_exercise.id if next_exercise is not None else None,
    )
