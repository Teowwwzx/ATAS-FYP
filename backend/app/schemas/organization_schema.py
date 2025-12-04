
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.organization_model import OrganizationType, OrganizationVisibility

class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    type: OrganizationType = OrganizationType.community
    website_url: Optional[str] = None
    location: Optional[str] = None
    visibility: OrganizationVisibility = OrganizationVisibility.public

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    type: Optional[OrganizationType] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    visibility: Optional[OrganizationVisibility] = None

class OrganizationResponse(OrganizationBase):
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
