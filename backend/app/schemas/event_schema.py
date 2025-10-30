from pydantic import BaseModel
import uuid
from datetime import datetime
from app.models.event_model import EventFormat, EventType, EventRegistrationType, EventStatus, EventVisibility

class EventDetails(BaseModel):
    id: uuid.UUID
    organizer_id: uuid.UUID
    title: str
    description: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    format: EventFormat
    type: EventType
    start_datetime: datetime
    end_datetime: datetime
    registration_type: EventRegistrationType
    status: EventStatus
    visibility: EventVisibility
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    remark: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}