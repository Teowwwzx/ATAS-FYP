import sys
import os
from datetime import datetime

# Add app to path
sys.path.append(os.getcwd())

from app.schemas.event_schema import EventCreate
from app.models.event_model import EventFormat, EventType, EventRegistrationType, EventVisibility
from pydantic import ValidationError

payload = {
    "title": "Test Title",
    "description": "Test Desc",
    "start_datetime": datetime.now(),
    "end_datetime": datetime.now(),
    "venue_place_id": "ChIJ...",
    "venue_remark": "Test Remark",
    "max_participant": 100,
    "type": "physical",
    "format": "conference",
    "visibility": "public",
    "registration_type": "free",
    "price": 0,
}

print("Testing valid payload...")
try:
    obj = EventCreate(**payload)
    print("SUCCESS: Payload valid.")
except ValidationError as e:
    print("FAILURE: Payload invalid.")
    print(e)

print("\nTesting payload with venue_name (should fail)...")
payload_with_extra = payload.copy()
payload_with_extra["venue_name"] = "Extra Field"
try:
    obj = EventCreate(**payload_with_extra)
    print("SUCCESS: Payload with venue_name valid (UNEXPECTED).")
except ValidationError as e:
    print("FAILURE: Payload with venue_name invalid (EXPECTED).")
    print(e)
