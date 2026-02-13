from pydantic import BaseModel


class BranchLevelOut(BaseModel):
    """Coarse branch level computed from topic mastery."""

    user_id: int
    topic_ids: list[int]
    branch_level: int
