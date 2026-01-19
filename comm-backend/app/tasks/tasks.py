from celery import Celery
from app.core.config import settings
from app.services.redis_counters import redis

celery_app = Celery("comm_tasks", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

@celery_app.task
def flush_counter(kind: str, target_id: str):
    key = f"{kind}:{target_id}"
    val = redis.get(key)
    return val
