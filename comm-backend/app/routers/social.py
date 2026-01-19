from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, insert
from jose import jwt
from app.core.config import settings
from app.database.session import get_session
from app.models.graph import Follow, Collection

router = APIRouter(tags=["social"])

def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    return payload.get("sub")

@router.post("/follow/{user_id}")
async def follow(user_id: str, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    me = get_user_id(authorization)
    f = Follow(follower_id=me, following_id=user_id)
    session.add(f)
    await session.commit()
    return {"ok": True}

@router.delete("/follow/{user_id}")
async def unfollow(user_id: str, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    me = get_user_id(authorization)
    await session.execute(delete(Follow).where(Follow.follower_id == me, Follow.following_id == user_id))
    await session.commit()
    return {"ok": True}

@router.post("/collections")
async def create_collection(name: str, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    me = get_user_id(authorization)
    c = Collection(user_id=me, name=name)
    session.add(c)
    await session.commit()
    return {"id": str(c.id), "name": c.name}
