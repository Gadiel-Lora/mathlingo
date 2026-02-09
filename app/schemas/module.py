from pydantic import BaseModel

class ModuleBase(BaseModel):
    title: str
    description: str | None = None

class ModuleCreate(ModuleBase):
    pass

class ModuleResponse(ModuleBase):
    id: int

    class Config:
        from_attributes = True
