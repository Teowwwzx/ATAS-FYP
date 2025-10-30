import uuid
import secrets
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.schemas.user_schema import UserCreate
from app.core.security import get_password_hash

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    verification_token = secrets.token_urlsafe(32)
    db_user = User(
        email=user.email,
        password=hashed_password,
        referral_code=uuid.uuid4().hex[:8],
        verification_token=verification_token
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # TODO: Send verification email
    print(f"Verification token for {user.email}: {verification_token}")

    return db_user