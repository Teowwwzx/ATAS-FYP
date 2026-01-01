from pydantic import BaseModel
from typing import List
from datetime import datetime
import uuid
from app.models.event_model import EventFormat, EventType, EventRegistrationType, EventStatus, EventVisibility, EventParticipantRole, EventParticipantStatus, EventPaymentStatus
from app.schemas.user_schema import UserResponse

# ... (existing content) ...

class EventCategoryCreate(BaseModel):
    category_id: uuid.UUID

class EventCategoryResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    name: str | None = None # Joined
    
    model_config = {"from_attributes": True}

class EventPictureCreate(BaseModel):
    url: str
    caption: str | None = None
    sort_order: int = 0

class EventPictureResponse(BaseModel):
    id: uuid.UUID
    url: str
    caption: str | None = None
    sort_order: int
    created_at: datetime
    
    model_config = {"from_attributes": True}

class EventParticipantCreate(BaseModel):
    user_id: uuid.UUID | None = None
    email: str | None = None # For external invites
    role: EventParticipantRole
    description: str | None = None
    proposal_id: uuid.UUID | None = None # If inviting based on a proposal

class EventParticipantUpdate(BaseModel):
    role: EventParticipantRole | None = None
    status: EventParticipantStatus | None = None
    payment_status: EventPaymentStatus | None = None

class EventParticipantResponseUpdate(BaseModel):
    status: EventParticipantStatus

class EventParticipantDetails(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    event_id: uuid.UUID
    name: str | None = None
    email: str | None = None
    role: EventParticipantRole
    status: EventParticipantStatus
    payment_status: EventPaymentStatus | None = None
    payment_proof_url: str | None = None
    join_method: str | None = None
    created_at: datetime
    
    # User details (joined)
    user_avatar: str | None = None
    user_full_name: str | None = None
    user_title: str | None = None # Profile title
    
    # Proposal details
    proposal_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}

class EventCreate(BaseModel):
    title: str
    format: EventFormat
    type: EventType
    start_datetime: datetime
    end_datetime: datetime
    registration_type: EventRegistrationType
    visibility: EventVisibility
    # Optional initial fields
    description: str | None = None
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    categories: List[uuid.UUID] = []

class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    meeting_url: str | None = None
    payment_qr_url: str | None = None
    format: EventFormat | None = None
    type: EventType | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    registration_type: EventRegistrationType | None = None
    status: EventStatus | None = None
    visibility: EventVisibility | None = None
    auto_accept_registration: bool | None = None
    is_attendance_enabled: bool | None = None
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    remark: str | None = None
    price: float | None = None
    currency: str | None = None

class EventDetails(BaseModel):
    id: uuid.UUID
    organizer_id: uuid.UUID
    organization_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    meeting_url: str | None = None
    payment_qr_url: str | None = None
    format: EventFormat
    type: EventType
    start_datetime: datetime
    end_datetime: datetime
    registration_type: EventRegistrationType
    registration_status: str # enum
    status: EventStatus
    visibility: EventVisibility
    auto_accept_registration: bool
    is_attendance_enabled: bool
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    venue_name: str | None = None # Derived/Joined
    venue_address: str | None = None # Derived/Joined
    remark: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    price: float | None = None
    currency: str | None = None
    
    organizer_name: str | None = None
    organizer_avatar: str | None = None
    
    categories: List[EventCategoryResponse] = []
    pictures: List[EventPictureResponse] = []
    
    # Computed
    participant_count: int = 0
    
    model_config = {"from_attributes": True}

class EventReminderCreate(BaseModel):
    option: str

class EventReminderResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    option: str
    remind_at: datetime
    is_sent: bool
    created_at: datetime
    
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

# --- Walk-in Schemas ---

class EventWalkInTokenCreate(BaseModel):
    label: str | None = None
    max_uses: int | None = None # None means unlimited

class EventWalkInTokenResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    token: str
    label: str | None = None
    max_uses: int | None = None
    current_uses: int
    is_active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}

class WalkInRegistrationRequest(BaseModel):
    name: str
    email: str
    payment_proof_url: str | None = None # Required if paid event
