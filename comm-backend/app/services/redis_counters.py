import asyncio
from typing import Literal
from redis.asyncio import Redis
from app.core.config import settings

redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

async def incr_counter(kind: Literal["likes","comments","collects"], target_id: str) -> int:
    key = f"{kind}:{target_id}"
    return await redis.incr(key)
