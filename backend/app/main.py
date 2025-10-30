# app/main.py


from fastapi import FastAPI
from app.core.config import settings
from app.routers import admin_router, event_router, follows_router, email_router

app = FastAPI(
    title="ATAS API",
    version="1.0.0"
)

# Include your routers
app.include_router(admin_router.router)
app.include_router(event_router.router, prefix="/api/v1", tags=["Events"])
app.include_router(follows_router.router, prefix="/api/v1", tags=["Follows"])
app.include_router(email_router.router, prefix="/api/v1", tags=["Email"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the ATAS API!"}