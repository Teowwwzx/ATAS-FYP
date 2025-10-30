from pydantic import BaseModel, EmailStr, ConfigDict
import uuid
from app.models.user_model import UserStatus

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_verified: bool
    status: UserStatus