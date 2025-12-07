# profile_schema.py


from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime
from typing import List, Optional
from app.models.profile_model import ProfileVisibility

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class SkillBase(BaseModel):
    name: str

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class ProfileBase(BaseModel):
    full_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    visibility: ProfileVisibility = ProfileVisibility.public

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    visibility: Optional[ProfileVisibility] = None

class ProfileResponse(ProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    tags: List[TagResponse] = []
    average_rating: float = 0.0
    reviews_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class EducationBase(BaseModel):
    qualification: Optional[str] = None
    field_of_study: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    resume_url: Optional[str] = None
    remark: Optional[str] = None

class EducationCreate(EducationBase):
    org_id: Optional[uuid.UUID] = None

class EducationUpdate(EducationBase):
    org_id: Optional[uuid.UUID] = None

class EducationResponse(EducationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    org_id: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)

class JobExperienceBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None

class JobExperienceCreate(JobExperienceBase):
    org_id: Optional[uuid.UUID] = None

class JobExperienceUpdate(JobExperienceBase):
    org_id: Optional[uuid.UUID] = None

class JobExperienceResponse(JobExperienceBase):
    id: uuid.UUID
    user_id: uuid.UUID
    org_id: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)

class OnboardingUpdate(BaseModel):
    full_name: str
    role: str
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
