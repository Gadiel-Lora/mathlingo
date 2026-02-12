from pydantic import BaseModel


class ExerciseSuggestion(BaseModel):
    """Suggested exercise without revealing the answer."""

    id: int
    question: str
    topic_id: int | None = None
    level_id: int | None = None

    class Config:
        from_attributes = True
