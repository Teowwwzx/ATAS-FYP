from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_session
from app.models.community_model import Post
from app.schemas.post import PostResponse
from jose import jwt
from app.core.config import settings

router = APIRouter(prefix="/utilities", tags=["utilities"])

def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    return payload.get("sub")

@router.post("/review", response_model=PostResponse)
async def create_review(title: str, content: str, rating: int, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    p = Post(user_id=user_id, title=title, content=content, category="review", extra={"rating": rating})
    session.add(p)
    await session.commit()
    return PostResponse(id=str(p.id), title=p.title, content=p.content, media_urls=[], tags=[], location=None, likes_count=p.likes_count, comments_count=p.comments_count, collects_count=p.collects_count)

@router.post("/teamup", response_model=PostResponse)
async def create_teamup(title: str, content: str, event_time: str, max_participants: int, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    p = Post(user_id=user_id, title=title, content=content, category="teamup", extra={"event_time": event_time, "max_participants": max_participants, "current_participants": 1})
    session.add(p)
    await session.commit()
    return PostResponse(id=str(p.id), title=p.title, content=p.content, media_urls=[], tags=[], location=None, likes_count=p.likes_count, comments_count=p.comments_count, collects_count=p.collects_count)

@router.post("/market", response_model=PostResponse)
async def create_market(title: str, content: str, price: float, condition: str, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    p = Post(user_id=user_id, title=title, content=content, category="market", extra={"price": price, "condition": condition, "is_sold": False})
    session.add(p)
    await session.commit()
    return PostResponse(id=str(p.id), title=p.title, content=p.content, media_urls=[], tags=[], location=None, likes_count=p.likes_count, comments_count=p.comments_count, collects_count=p.collects_count)
