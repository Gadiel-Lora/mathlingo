from pydantic import BaseModel, ConfigDict


class ProgressCreate(BaseModel):
    module_id: int
    xp: int


class ProgressOut(BaseModel):
    id: int
    user_id: int
    module_id: int
    xp: int

    model_config = ConfigDict(from_attributes=True)


class ProgressSummary(BaseModel):
    total_xp: int
