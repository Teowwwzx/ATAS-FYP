from __future__ import annotations

from celery import Celery

from app.core.config import settings


def _get_celery_broker_url() -> str:
    if settings.CELERY_BROKER_URL:
        return settings.CELERY_BROKER_URL
    return settings.REDIS_URL


def _get_celery_result_backend() -> str:
    if settings.CELERY_RESULT_BACKEND:
        return settings.CELERY_RESULT_BACKEND
    return settings.REDIS_URL


celery_app = Celery(
    "comm",
    broker=_get_celery_broker_url(),
    backend=_get_celery_result_backend(),
    include=["app.tasks.tasks"],
)


@celery_app.task(name="comm.ping")
def ping() -> str:
    return "pong"

