# app/main.py


import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import admin_router, event_router, follows_router, email_router, auth_router, user_router, profile_router

app = FastAPI(
    title="ATAS API",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Include your routers
app.include_router(admin_router.router)
app.include_router(event_router.router, prefix="/api/v1", tags=["Events"])
app.include_router(follows_router.router, prefix="/api/v1", tags=["Follows"])
app.include_router(email_router.router, prefix="/api/v1/email", tags=["Email"])
app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(user_router.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(profile_router.router, prefix="/api/v1/profiles", tags=["Profiles"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the ATAS API!"}