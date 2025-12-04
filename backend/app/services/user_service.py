import uuid
import secrets
from sqlalchemy.orm import Session
from app.models.user_model import User, Role
from app.models.profile_model import Profile
from app.schemas.user_schema import UserCreate
from app.core.security import get_password_hash
from app.services.email_service import send_verification_email

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
    db.flush()

    # Create a profile for the user
    db_profile = Profile(user_id=db_user.id, full_name="")
    db.add(db_profile)
    db.commit()
    db.refresh(db_user)

    send_verification_email(email=user.email, token=verification_token)

    return db_user

def assign_role_to_user(db: Session, user: User, role_name: str):
    role_name = role_name.strip().lower()
    role = db.query(Role).filter(Role.name == role_name).first()
    if role is None:
        role = Role(name=role_name)
        db.add(role)
        db.flush()
    if all(r.name != role_name for r in user.roles):
        user.roles.append(role)
    db.commit()
    db.refresh(user)
    return user

def remove_role_from_user(db: Session, user: User, role_name: str):
    role_name = role_name.strip().lower()
    role = db.query(Role).filter(Role.name == role_name).first()
    if role is None:
        return user
    user.roles = [r for r in user.roles if r.name != role_name]
    db.commit()
    db.refresh(user)
    return user
