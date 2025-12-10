# app/main.py


import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import admin_router, event_router, follows_router, email_router, auth_router, user_router, profile_router, review_router, notification_router, taxonomy_router
try:
    from app.routers import organization_router
    _has_org_router = hasattr(organization_router, "router")
except ImportError:
    _has_org_router = False
from app.database.database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

app = FastAPI(
    title="ATAS API",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "https://thedzx.site",
        "https://www.thedzx.site",
        "https://atas-fyp-git-master-teowzxs-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Include your routers
app.include_router(admin_router.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(event_router.router, prefix="/api/v1", tags=["Events"])
app.include_router(follows_router.router, prefix="/api/v1", tags=["Follows"])
app.include_router(email_router.router, prefix="/api/v1/email", tags=["Email"])
app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(user_router.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(profile_router.router, prefix="/api/v1/profiles", tags=["Profiles"])
if _has_org_router:
    app.include_router(organization_router.router, prefix="/api/v1", tags=["Organizations"])
app.include_router(review_router.router, prefix="/api/v1", tags=["Reviews"])
app.include_router(notification_router.router, prefix="/api/v1", tags=["Notifications"])

from app.routers import ai_router
app.include_router(ai_router.router, prefix="/api/v1/ai", tags=["AI"])

if os.environ.get("PYTEST_CURRENT_TEST"):
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

from app.routers import communication_log_router
app.include_router(communication_log_router.router, prefix="/api/v1", tags=["Communications"])
app.include_router(taxonomy_router.router, prefix="/api/v1", tags=["Taxonomy"])

from app.routers import chat_router
app.include_router(chat_router.router, prefix="/api/v1", tags=["Chat"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the ATAS API!"}

@app.get("/api/v1/ping")
def ping():
    return {"message": "pong"}
