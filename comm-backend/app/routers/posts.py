from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from app.core.config import settings
from app.database.session import get_session
from app.models.community_model import Post
from app.schemas.post import PostCreate, PostResponse
from app.services.moderation import is_text_allowed

router = APIRouter(prefix="/posts", tags=["posts"])

def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    return payload.get("sub")

@router.post("", response_model=PostResponse)
async def create_post(data: PostCreate, session: AsyncSession = Depends(get_session), authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    if not is_text_allowed(data.title) or (data.content and not is_text_allowed(data.content)):
        raise HTTPException(status_code=400, detail="Content not allowed")
    post = Post(
        user_id=user_id,
        title=data.title,
        content=data.content,
        media_urls=[m.dict() for m in data.media_urls],
        tags=data.tags,
        location=data.location,
    )
    session.add(post)
    await session.commit()
    return PostResponse(
        id=str(post.id),
        title=post.title,
        content=post.content,
        media_urls=data.media_urls,
        tags=post.tags,
        location=post.location,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        collects_count=post.collects_count,
    )

@router.get("", response_model=list[PostResponse])
async def list_posts(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Post).order_by(Post.created_at.desc()))
    posts = res.scalars().all()
    return [
        PostResponse(
            id=str(p.id),
            title=p.title,
            content=p.content,
            media_urls=[m for m in (p.media_urls or [])],
            tags=p.tags or [],
            location=p.location,
            likes_count=p.likes_count,
            comments_count=p.comments_count,
            collects_count=p.collects_count,
        ) for p in posts
    ]
