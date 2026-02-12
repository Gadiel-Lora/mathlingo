from pydantic import BaseModel


class UserMasteryOut(BaseModel):
    """Represents a single mastery score for a topic."""

    topic_id: int
    mastery_score: float

    class Config:
        from_attributes = True


class UserProgressOut(BaseModel):
    """Aggregated mastery progress for a user."""

    user_id: int
    mastery: list[UserMasteryOut]
