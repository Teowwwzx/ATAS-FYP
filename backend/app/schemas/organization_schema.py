from pydantic import BaseModel, ConfigDict
import uuid
from typing import Optional
from app.models.organization_model import OrganizationType, OrganizationVisibility
from app.models.organization_model import OrganizationRole
from datetime import datetime


class OrganizationResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    type: str
    website_url: Optional[str] = None
    location: Optional[str] = None
    visibility: str

    model_config = ConfigDict(from_attributes=True)


class OrganizationCreate(BaseModel):
    owner_id: uuid.UUID
    name: str
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    type: OrganizationType = OrganizationType.community
    website_url: Optional[str] = None
    location: Optional[str] = None
    visibility: OrganizationVisibility = OrganizationVisibility.public


class OrganizationUpdate(BaseModel):
    owner_id: Optional[uuid.UUID] = None
    name: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    type: Optional[OrganizationType] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    visibility: Optional[OrganizationVisibility] = None


class OrganizationMemberCreate(BaseModel):
    user_id: uuid.UUID
    role: OrganizationRole = OrganizationRole.member


class OrganizationMemberUpdate(BaseModel):
    role: OrganizationRole


class OrganizationMemberResponse(BaseModel):
    org_id: uuid.UUID
    user_id: uuid.UUID
    role: OrganizationRole
    created_at: datetime | None = None
    updated_at: datetime | None = None
