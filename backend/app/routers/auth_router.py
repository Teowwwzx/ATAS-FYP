# auth_router.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import create_access_token, verify_password, decode_access_token
from datetime import timedelta
from app.dependencies import get_current_user

router = APIRouter()

from app.schemas.user_schema import UserCreate, UserResponse
from app.services.user_service import create_user


@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db=db, user=user, background_tasks=background_tasks)


@router.post("/login")
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
        data={"sub": str(user.id), "type": "access"}
    )
    refresh_token = create_access_token(
        data={"sub": user.email, "type": "refresh"},
        expires_delta=timedelta(days=30),
    )
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


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

@router.post("/refresh")
def refresh_access_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_access_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or user.status != UserStatus.active:
        raise HTTPException(status_code=400, detail="User invalid or inactive")
    access_token = create_access_token(data={"sub": str(user.id), "type": "access"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out"}

from pydantic import BaseModel, EmailStr
import uuid
from app.services.email_service import send_verification_email

class ResendVerificationRequest(BaseModel):
    email: EmailStr

@router.post("/resend-verification")
def resend_verification_email_endpoint(
    request: ResendVerificationRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == request.email).first()
    
    # Generic message to prevent user enumeration? 
    # User's requirement implies they know the account exists and is unverified from the login error.
    # But for security, if user not found, we usually return success too.
    # However, if user is already verified, we should probably tell them "Already verified".
    
    if not user:
        # Return success to prevent enumeration, or maybe 404? 
        # Given the UX "Your email is not verified", the user KNOWS the email is in system.
        # But if a different email is typed in the resend box?
        return {"message": "If your account exists and is unverified, a new verification email has been sent."}
        
    if user.is_verified:
        return {"message": "Email is already verified. Please login."}

    # Generate new token
    new_token = str(uuid.uuid4())
    user.verification_token = new_token
    db.commit()

    background_tasks.add_task(send_verification_email, user.email, new_token)
    
    return {"message": "Verification email resent successfully."}
