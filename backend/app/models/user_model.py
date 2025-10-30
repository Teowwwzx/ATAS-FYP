# model/user_model.py

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text, Enum, Table, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
import uuid
from app.database.database import Base

class UserStatus(enum.Enum):
    active = "active"
    inactive = "inactive"
    frozen = "frozen"
    suspended = "suspended"

# User-Role many-to-many relationship table
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    
    # Application-specific fields
    is_verified = Column(Boolean, default=False, server_default=text("FALSE"))
    verification_token = Column(String, unique=True, nullable=True)
    status = Column(Enum(UserStatus), default=UserStatus.inactive, nullable=False)
    referral_code = Column(String, unique=True, nullable=False)
    referred_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")

class AuthMailTemplate(Base):
    __tablename__ = "auth_mail_templates"
    
    id = Column(Integer, primary_key=True)
    type = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
