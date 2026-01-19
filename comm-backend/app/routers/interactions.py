from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from app.core.config import settings
from app.database.session import get_session
from app.models.community_model import Interaction, Post, Comment
from app.schemas.interaction import LikeRequest, CollectRequest
from app.services.redis_counters import incr_counter

router = APIRouter(prefix="/interactions", tags=["interactions"])

def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    return payload.get("sub")

@router.post("/like")
async def like(data: LikeRequest, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    inter = Interaction(user_id=user_id, target_id=data.target_id, target_type=data.target_type, action="like")
    session.add(inter)
    await session.commit()
    await incr_counter("likes", data.target_id)
    return {"ok": True}

@router.post("/collect")
async def collect(data: CollectRequest, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    inter = Interaction(user_id=user_id, target_id=data.target_id, target_type="post", action="collect")
    session.add(inter)
    await session.commit()
    await incr_counter("collects", data.target_id)
    return {"ok": True}
