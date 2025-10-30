from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.schemas.user_schema import UserCreate, UserResponse
from app.services.user_service import create_user

router = APIRouter()

@router.post("/", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db=db, user=user)


@router.get("/verify/{token}")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    user.is_verified = True
    user.status = UserStatus.active
    user.verification_token = None
    db.commit()

    return {"message": "Email verified successfully"}