import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database.database import Base

class Notification(Base):
    __tablename__ = "comm_notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    type = Column(String(20), nullable=False)
    sender_id = Column(UUID(as_uuid=True), nullable=True)
    target_id = Column(UUID(as_uuid=True), nullable=True)
    payload = Column(String(1000), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
