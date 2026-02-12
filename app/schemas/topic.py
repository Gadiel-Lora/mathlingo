from pydantic import BaseModel


class TopicOut(BaseModel):
    """Public topic representation with prerequisites."""

    id: int
    name: str
    description: str | None = None
    level: int
    prerequisites: list[int] = []

    class Config:
        from_attributes = True
