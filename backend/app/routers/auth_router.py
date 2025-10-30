from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import create_access_token, verify_password

router = APIRouter()

@router.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=400,
            detail="User is not active. Please verify your email.",
        )
    access_token = create_access_token(
        data={"sub": str(user.id)}
    )
    return {"access_token": access_token, "token_type": "bearer"}