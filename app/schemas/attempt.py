from datetime import datetime

from pydantic import BaseModel


class AttemptCreate(BaseModel):
    """Payload for creating an exercise attempt."""

    user_id: int
    exercise_id: int
    is_correct: bool


class AttemptOut(BaseModel):
    """Response model for an exercise attempt."""

    id: int
    user_id: int
    exercise_id: int
    is_correct: bool
    created_at: datetime
    mastery_score: float | None = None

    class Config:
        from_attributes = True
