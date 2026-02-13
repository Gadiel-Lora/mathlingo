from pydantic import BaseModel, Field


class TopicOut(BaseModel):
    """Public topic representation with prerequisites."""

    id: int
    name: str
    description: str | None = None
    level: int
    prerequisites: list[int] = Field(default_factory=list)

    class Config:
        from_attributes = True
