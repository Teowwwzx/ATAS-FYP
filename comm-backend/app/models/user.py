import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.database.database import Base

class User(Base):
    __tablename__ = "comm_users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Profile(Base):
    __tablename__ = "comm_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    nickname = Column(String(50), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    bio = Column(String(255), nullable=True)
    enrollment_year = Column(Integer, nullable=True)
    interests = Column(ARRAY(String), default=[])
