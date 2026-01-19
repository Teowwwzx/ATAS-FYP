from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database.session import get_session
from app.models.community_model import Post
from app.schemas.post import PostResponse

router = APIRouter(prefix="/search", tags=["search"])

@router.get("", response_model=list[PostResponse])
async def search(q: str = Query(..., min_length=1), session: AsyncSession = Depends(get_session)):
    like = f"%{q}%"
    res = await session.execute(
        select(Post).where(
            or_(
                Post.title.ilike(like),
                Post.content.ilike(like),
            )
        )
    )
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
