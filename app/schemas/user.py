from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    role: str

    model_config = ConfigDict(from_attributes=True)


class UserPromoteRequest(BaseModel):
    email: str
