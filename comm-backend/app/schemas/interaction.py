from pydantic import BaseModel

class LikeRequest(BaseModel):
    target_id: str
    target_type: str

class CollectRequest(BaseModel):
    target_id: str
