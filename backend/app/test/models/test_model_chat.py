import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.chat_model import Conversation, Message, ConversationParticipant
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"chat_test_{uuid.uuid4()}@example.com"
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

def test_create_conversation(db: Session):
    """Test creating a conversation with participants"""
    user1 = create_user(db)
    user2 = create_user(db)
    
    conv = Conversation()
    db.add(conv)
    db.commit()
    db.refresh(conv)
    
    # Add participants
    p1 = ConversationParticipant(conversation_id=conv.id, user_id=user1.id)
    p2 = ConversationParticipant(conversation_id=conv.id, user_id=user2.id)
    db.add_all([p1, p2])
    db.commit()
    
    assert conv.id is not None
    
    # Verify participants
    db.refresh(conv)
    assert len(conv.participants) == 2

def test_create_message(db: Session):
    """Test creating a message"""
    user1 = create_user(db)
    conv = Conversation()
    db.add(conv)
    db.commit()
    
    msg = Message(
        conversation_id=conv.id,
        sender_id=user1.id,
        content="Hello World"
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    assert msg.id is not None
    assert msg.content == "Hello World"
    assert msg.conversation_id == conv.id
    assert msg.is_read is False
