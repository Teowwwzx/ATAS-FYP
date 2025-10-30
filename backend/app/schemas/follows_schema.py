from pydantic import BaseModel
import uuid
from datetime import datetime

class FollowDetails(BaseModel):
    id: uuid.UUID
    follower_id: uuid.UUID
    followee_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}