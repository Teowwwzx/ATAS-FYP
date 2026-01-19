from pydantic import BaseModel
from typing import List, Optional

class MediaItem(BaseModel):
    url: str
    w: Optional[int] = None
    h: Optional[int] = None
    type: str = "image"

class PostCreate(BaseModel):
    title: str
    content: Optional[str] = None
    media_urls: List[MediaItem] = []
    tags: List[str] = []
    location: Optional[str] = None

class PostResponse(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    media_urls: List[MediaItem] = []
    tags: List[str] = []
    location: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    collects_count: int = 0
