from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.services.socket_manager import app as socket_app
from app.routers.comment import router as comment_router
from app.core.config import settings
from app.database.init_db import init_db_schema

app = FastAPI(title="ATAS Link Community API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/ws", socket_app)

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def _startup() -> None:
    if settings.AUTO_CREATE_TABLES:
        await init_db_schema()

try:
    from app.routers.posts import router as posts_router
    app.include_router(posts_router, prefix="/v1")
except Exception:
    ...

try:
    from app.routers.auth import router as auth_router
    app.include_router(auth_router, prefix="/v1")
except Exception:
    ...

app.include_router(comment_router, prefix="/v1")

try:
    from app.routers.interactions import router as interactions_router
    app.include_router(interactions_router, prefix="/v1")
except Exception:
    ...

try:
    from app.routers.feed import router as feed_router
    app.include_router(feed_router, prefix="/v1")
except Exception:
    ...

try:
    from app.routers.search import router as search_router
    app.include_router(search_router, prefix="/v1")
except Exception:
    ...

try:
    from app.routers.social import router as social_router
    app.include_router(social_router, prefix="/v1")
except Exception:
    ...

try:
    from app.routers.utilities import router as utilities_router
    app.include_router(utilities_router, prefix="/v1")
except Exception:
    ...

try:
    from app.routers.notifications import router as notifications_router
    app.include_router(notifications_router, prefix="/v1")
except Exception:
    ...


