from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.community_model import Post

async def latest_posts(session: AsyncSession, limit: int = 20):
    res = await session.execute(select(Post).order_by(Post.created_at.desc()).limit(limit))
    return res.scalars().all()

def score_post(p: Post) -> float:
    return (p.likes_count * 2 + p.comments_count * 5 + p.collects_count) / 1.0

async def recommend_posts(session: AsyncSession, limit: int = 20):
    res = await session.execute(select(Post))
    posts = res.scalars().all()
    posts.sort(key=score_post, reverse=True)
    return posts[:limit]
