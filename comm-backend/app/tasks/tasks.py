from __future__ import annotations

import redis as redis_sync

from app.core.config import settings
from app.worker import celery_app


@celery_app.task(name="comm.redis_get")
def redis_get(key: str) -> str | None:
    r = redis_sync.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return r.get(key)


@celery_app.task(name="comm.flush_counter")
def flush_counter(kind: str, target_id: str) -> int | None:
    r = redis_sync.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    raw = r.get(f"{kind}:{target_id}")
    if raw is None:
        return None
    try:
        return int(raw)
    except ValueError:
        return None
