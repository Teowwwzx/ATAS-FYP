# model/event_model.py

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text, Enum, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import enum
import uuid
from app.database.database import Base

class EventFormat(enum.Enum):
    panel_discussion = "panel_discussion"
    workshop = "workshop"
    webinar = "webinar"
    seminar = "seminar"
    club_event = "club_event"
    other = "other"

class EventType(enum.Enum):
    online = "online"
    offline = "offline"
    hybrid = "hybrid"

class EventRegistrationType(enum.Enum):
    free = "free"
    paid = "paid"

class EventStatus(enum.Enum):
    draft = "draft"
    opened = "opened"
    closed = "closed"
    declined = "declined"
    completed = "completed"

class EventVisibility(enum.Enum):
    public = "public"
    private = "private"

class EventParticipantRole(enum.Enum):
    organizer = "organizer"
    committee = "committee"
    speaker = "speaker"
    sponsor = "sponsor"
    audience = "audience"
    student = "student"
    teacher = "teacher"

class EventParticipantStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    attended = "attended"
    absent = "absent"

class Event(Base):
    __tablename__ = "events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String, nullable=True)
    cover_url = Column(String, nullable=True)
    format = Column(Enum(EventFormat), nullable=False)
    type = Column(Enum(EventType), nullable=False)
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    registration_type = Column(Enum(EventRegistrationType), nullable=False)
    status = Column(Enum(EventStatus), default=EventStatus.draft, nullable=False)
    visibility = Column(Enum(EventVisibility), default=EventVisibility.public, nullable=False)
    max_participant = Column(Integer, nullable=True)
    venue_place_id = Column(String, nullable=True)
    venue_remark = Column(String, nullable=True)
    remark = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EventCategory(Base):
    __tablename__ = "event_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EventPicture(Base):
    __tablename__ = "event_pictures"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    url = Column(String, nullable=False)
    caption = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EventParticipant(Base):
    __tablename__ = "event_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(Enum(EventParticipantRole), nullable=False)
    description = Column(String, nullable=True)
    status = Column(Enum(EventParticipantStatus), nullable=False, default=EventParticipantStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EventMailTemplate(Base):
    __tablename__ = "event_mail_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())