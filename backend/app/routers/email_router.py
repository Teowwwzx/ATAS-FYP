from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user_model import User
from app.schemas.email_schema import PasswordResetRequest, PasswordReset
from app.services.email_service import send_password_reset_email
from app.core.security import create_access_token, decode_access_token, get_password_hash

router = APIRouter()

@router.post("/forgot-password")
def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_access_token(data={"sub": user.email, "type": "password_reset"})
    send_password_reset_email(email=user.email, token=token)
    return {"message": "Password reset email sent"}

@router.post("/reset-password")
def reset_password(token: str, request: PasswordReset, db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid token")

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = get_password_hash(request.password)
    db.commit()
    return {"message": "Password reset successfully"}