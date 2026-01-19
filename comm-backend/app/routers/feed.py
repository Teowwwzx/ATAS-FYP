from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_session
from app.services.feed import latest_posts, recommend_posts
from app.models.community_model import Post
from app.schemas.post import PostResponse

router = APIRouter(prefix="/feed", tags=["feed"])

def to_response(p: Post) -> PostResponse:
    return PostResponse(
        id=str(p.id),
        title=p.title,
        content=p.content,
        media_urls=[m for m in (p.media_urls or [])],
        tags=p.tags or [],
        location=p.location,
        likes_count=p.likes_count,
        comments_count=p.comments_count,
        collects_count=p.collects_count,
    )

@router.get("/latest", response_model=list[PostResponse])
async def latest(session: AsyncSession = Depends(get_session), limit: int = Query(default=20, le=50)):
    posts = await latest_posts(session, limit)
    return [to_response(p) for p in posts]

@router.get("/recommend", response_model=list[PostResponse])
async def recommend(session: AsyncSession = Depends(get_session), limit: int = Query(default=20, le=50)):
    posts = await recommend_posts(session, limit)
    return [to_response(p) for p in posts]

@router.get("/tags/{tag}/posts", response_model=list[PostResponse])
async def by_tag(tag: str, session: AsyncSession = Depends(get_session)):
    from sqlalchemy import select
    res = await session.execute(select(Post).where(Post.tags.contains([tag])))
    posts = res.scalars().all()
    return [to_response(p) for p in posts]
