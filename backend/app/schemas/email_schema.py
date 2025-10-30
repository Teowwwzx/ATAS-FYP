from pydantic import BaseModel, EmailStr

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    password: str