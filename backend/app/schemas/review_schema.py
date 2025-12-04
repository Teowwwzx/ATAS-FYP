from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime

class ReviewCreate(BaseModel):
    event_id: uuid.UUID
    reviewee_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = None

class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewee_id: uuid.UUID
    rating: int
    comment: str | None = None
    created_at: datetime
