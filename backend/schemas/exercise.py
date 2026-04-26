from pydantic import BaseModel, ConfigDict


class ExerciseSuggestion(BaseModel):
    """Suggested exercise without revealing the answer."""

    id: int
    question: str
    topic_id: int | None = None
    level_id: int | None = None

    model_config = ConfigDict(from_attributes=True)
