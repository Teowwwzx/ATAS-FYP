# app/routers/admin_router.py


from fastapi import APIRouter

router = APIRouter()

@router.get("/ping")
def read_admin_root():
    return {"message": "Welcome to the ATAS Admin API!"}