from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from jose import jwt
from app.core.config import settings
from app.database.session import get_session
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])

def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    return payload.get("sub")

@router.get("", response_model=list[dict])
async def list_notifications(session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    res = await session.execute(select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()))
    items = res.scalars().all()
    return [{"id": str(n.id), "type": n.type, "is_read": n.is_read, "payload": n.payload} for n in items]

@router.post("/read")
async def mark_read(ids: list[str], session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    await session.execute(update(Notification).where(Notification.user_id == user_id, Notification.id.in_(ids)).values(is_read=True))
    await session.commit()
    return {"ok": True}
