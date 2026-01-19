import uuid
from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.database.database import Base

class Follow(Base):
    __tablename__ = "comm_follows"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    following_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Collection(Base):
    __tablename__ = "comm_collections"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
