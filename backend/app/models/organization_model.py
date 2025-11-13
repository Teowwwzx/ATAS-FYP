# model/organization.py


from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
import uuid
from app.database.database import Base

class OrganizationType(enum.Enum):
    company = "company"
    university = "university"
    community = "community"
    nonprofit = "nonprofit"
    government = "government"

class OrganizationVisibility(enum.Enum):
    public = "public"
    private = "private"

class OrganizationRole(enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"

organization_members = Table(
    'organization_members',
    Base.metadata,
    Column('org_id', UUID(as_uuid=True), ForeignKey('organizations.id'), primary_key=True),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('role', Enum(OrganizationRole), default=OrganizationRole.member, nullable=False),
    Column('created_at', DateTime(timezone=True), server_default=func.now()),
    Column('updated_at', DateTime(timezone=True), onupdate=func.now())
)

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    logo_url = Column(String, nullable=True)
    cover_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    type = Column(Enum(OrganizationType), default=OrganizationType.community, nullable=False)
    website_url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    visibility = Column(Enum(OrganizationVisibility), default=OrganizationVisibility.public, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    members = relationship("User", secondary=organization_members, back_populates="organizations")
