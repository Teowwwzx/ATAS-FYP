from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.event_model import Event
from app.schemas.event_schema import EventDetails
from typing import List

router = APIRouter()

@router.get("/events", response_model=List[EventDetails])
def get_all_events(db: Session = Depends(get_db)):
    events = db.query(Event).all()
    return events