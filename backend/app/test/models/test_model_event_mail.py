import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.event_model import EventMailTemplate

def test_event_mail_template(db: Session):
    """Test Event Mail Template Creation"""
    tpl = EventMailTemplate(
        type="invitation",
        subject="You are invited!",
        body="<h1>Come join us</h1>",
        is_default=True
    )
    db.add(tpl)
    db.commit()
    
    assert tpl.id is not None
    assert tpl.is_default is True
