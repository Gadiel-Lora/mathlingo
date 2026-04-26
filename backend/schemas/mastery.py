from pydantic import BaseModel, ConfigDict


class UserMasteryOut(BaseModel):
    """Represents a single mastery score for a topic."""

    topic_id: int
    mastery_score: float

    model_config = ConfigDict(from_attributes=True)


class UserProgressOut(BaseModel):
    """Aggregated mastery progress for a user."""

    user_id: int
    mastery: list[UserMasteryOut]
