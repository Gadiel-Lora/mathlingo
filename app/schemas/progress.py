from pydantic import BaseModel


class ProgressCreate(BaseModel):
    module_id: int
    xp: int


class ProgressOut(BaseModel):
    id: int
    user_id: int
    module_id: int
    xp: int

    class Config:
        from_attributes = True


class ProgressSummary(BaseModel):
    total_xp: int
