from pydantic import BaseModel, field_validator
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
import uuid
from datetime import datetime
from app.models.event_model import (
    EventFormat,
    EventType,
    EventRegistrationType,
    EventRegistrationStatus,
    EventStatus,
    EventVisibility,
    EventParticipantRole,
    EventParticipantStatus,
)

class EventCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str
    description: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    format: EventFormat
    type: EventType | None = None
    start_datetime: datetime
    end_datetime: datetime
    registration_type: EventRegistrationType
    visibility: EventVisibility = EventVisibility.public
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    remark: str | None = None
    price: float | None = 0.0
    currency: str | None = "MYR"


class EventUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')

    title: str | None = None
    description: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    payment_qr_url: str | None = None
    format: EventFormat | None = None
    type: EventType | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    registration_type: EventRegistrationType | None = None
    visibility: EventVisibility | None = None
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    remark: str | None = None
    price: float | None = None
    currency: str | None = None

class EventDetails(BaseModel):
    id: uuid.UUID
    organizer_id: uuid.UUID
    title: str
    description: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    payment_qr_url: str | None = None
    format: EventFormat
    type: EventType
    start_datetime: datetime
    end_datetime: datetime
    registration_type: EventRegistrationType
    registration_status: EventRegistrationStatus
    status: EventStatus
    visibility: EventVisibility
    auto_accept_registration: bool
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    remark: str | None = None
    price: float | None = 0.0
    currency: str | None = "MYR"
    created_at: datetime
    updated_at: datetime | None = None
    organizer_name: str | None = None
    organizer_avatar: str | None = None
    participant_count: int = 0
    meeting_url: str | None = None

    model_config = {"from_attributes": True}


class EventParticipationSummary(BaseModel):
    is_participant: bool
    my_role: EventParticipantRole | None = None
    my_status: EventParticipantStatus | None = None


class EventParticipantDetails(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    role: EventParticipantRole
    description: str | None = None
    join_method: str | None = None
    status: EventParticipantStatus
    created_at: datetime
    updated_at: datetime | None = None
    conversation_id: uuid.UUID | None = None
    proposal_id: uuid.UUID | None = None
    
    payment_proof_url: str | None = None
    payment_status: str | None = None

    model_config = {"from_attributes": True}


class EventParticipantCreate(BaseModel):
    user_id: uuid.UUID
    role: str = "audience"
    description: str | None = None
    proposal_id: uuid.UUID | None = None


class EventParticipantResponseUpdate(BaseModel):
    status: EventParticipantStatus


class EventParticipantBulkCreate(BaseModel):
    items: list[EventParticipantCreate]


class EventParticipantRoleUpdate(BaseModel):
    role: EventParticipantRole


# --- Category Schemas ---

class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: uuid.UUID


class EventCategoryAttach(BaseModel):
    category_ids: list[uuid.UUID]


# --- Attendance Schemas ---

class AttendanceQRResponse(BaseModel):
    token: str
    expires_at: datetime


class AttendanceScanRequest(BaseModel):
    token: str
    email: str | None = None
    walk_in: bool = False


class AttendanceUserScanRequest(BaseModel):
    token: str


class WalkInAttendanceRequest(BaseModel):
    name: str
    email: str


# --- Reminder Schemas ---

class EventReminderCreate(BaseModel):
    option: str  # one_week | three_days | one_day


class EventReminderResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    option: str
    remind_at: datetime
    is_sent: bool
    sent_at: datetime | None = None

    model_config = {"from_attributes": True}


# --- My Events Schema (for dashboard) ---

class MyEventItem(BaseModel):
    event_id: uuid.UUID
    title: str
    start_datetime: datetime
    end_datetime: datetime
    type: EventType
    status: EventStatus
    my_role: EventParticipantRole | None = None
    my_status: EventParticipantStatus | None = None


# --- Organizer Dashboard Schemas ---

class EventAttendanceStats(BaseModel):
    event_id: uuid.UUID
    total_audience: int
    attended_audience: int
    absent_audience: int
    total_participants: int
    attended_total: int


class EventChecklistItemCreate(BaseModel):
    title: str
    description: str | None = None
    assigned_user_id: uuid.UUID | None = None # Deprecated, use below
    assigned_user_ids: list[uuid.UUID] = []
    due_datetime: datetime | None = None

    @field_validator("assigned_user_id", "due_datetime", mode="before")
    def _empty_string_to_none(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class EventChecklistItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_completed: bool | None = None
    assigned_user_id: uuid.UUID | None = None # Deprecated
    assigned_user_ids: list[uuid.UUID] | None = None
    sort_order: int | None = None
    due_datetime: datetime | None = None

    @field_validator("assigned_user_id", "due_datetime", mode="before")
    def _empty_string_to_none_update(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class EventChecklistItemResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    title: str
    description: str | None = None
    is_completed: bool
    assigned_user_id: uuid.UUID | None = None
    assigned_user_ids: list[uuid.UUID] = [] # Population handled in router or property
    sort_order: int
    due_datetime: datetime | None = None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

# --- Proposal Schemas ---

class EventProposalCreate(BaseModel):
    title: str | None = None
    description: str | None = None
    file_url: str | None = None

class EventProposalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    file_url: str | None = None

class EventProposalResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    created_by_user_id: uuid.UUID
    title: str | None = None
    description: str | None = None
    file_url: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    conversation_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class EventProposalCommentCreate(BaseModel):
    content: str

class EventProposalCommentUpdate(BaseModel):
    content: str | None = None

class EventProposalCommentResponse(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class EventInvitationResponse(BaseModel):
    id: uuid.UUID
    event: EventDetails
    role: EventParticipantRole
    status: EventParticipantStatus
    created_at: datetime
    conversation_id: uuid.UUID | None = None
    description: str | None = None
    proposal_id: uuid.UUID | None = None
    proposal: EventProposalResponse | None = None
    
    # For outgoing requests (sent by me)
    invitee: EventParticipantDetails | None = None # We might want more user info here
    invitee_name: str | None = None
    invitee_email: str | None = None
    invitee_avatar: str | None = None
    
    model_config = {"from_attributes": True}

