from pydantic import BaseModel, ConfigDict, Field


class TopicOut(BaseModel):
    """Public topic representation with prerequisites."""

    id: int
    name: str
    description: str | None = None
    level: int
    prerequisites: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
