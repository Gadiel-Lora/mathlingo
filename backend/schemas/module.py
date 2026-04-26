from pydantic import BaseModel, ConfigDict


class ModuleBase(BaseModel):
    title: str
    description: str | None = None


class ModuleCreate(ModuleBase):
    pass


class ModuleResponse(ModuleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
