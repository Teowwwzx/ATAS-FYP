from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.follows_model import Follow
from app.schemas.follows_schema import FollowDetails
from typing import List

router = APIRouter()

@router.get("/follows", response_model=List[FollowDetails])
def get_all_follows(db: Session = Depends(get_db)):
    follows = db.query(Follow).all()
    return follows