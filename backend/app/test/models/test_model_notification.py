import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.notification_model import Notification, NotificationType
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"notif_test_{uuid.uuid4()}@example.com"
    user = User(
        email=email,
        password=get_password_hash("test"),
        referral_code=uuid.uuid4().hex[:8],
        is_dashboard_pro=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_create_notification(db: Session):
    """Test creating a notification"""
    user1 = create_user(db)
    user2 = create_user(db)
    
    notif = Notification(
        recipient_id=user1.id,
        actor_id=user2.id,
        type=NotificationType.system,
        content="Welcome!"
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    
    assert notif.id is not None
    assert notif.content == "Welcome!"
    assert notif.is_read is False

def test_delete_notification(db: Session):
    """Test deleting notification"""
    user1 = create_user(db)
    user2 = create_user(db)
    
    notif = Notification(
        recipient_id=user1.id,
        actor_id=user2.id,
        type=NotificationType.event,
        content="Invite"
    )
    db.add(notif)
    db.commit()
    
    notif_id = notif.id
    db.delete(notif)
    db.commit()
    
    assert db.query(Notification).filter(Notification.id == notif_id).first() is None
