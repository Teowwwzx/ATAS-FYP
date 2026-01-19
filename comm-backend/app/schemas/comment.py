from pydantic import BaseModel
from typing import Optional

class CommentCreate(BaseModel):
    post_id: str
    content: str
    parent_id: Optional[str] = None

class CommentResponse(BaseModel):
    id: str
    post_id: str
    content: str
    parent_id: Optional[str] = None
    root_id: Optional[str] = None
