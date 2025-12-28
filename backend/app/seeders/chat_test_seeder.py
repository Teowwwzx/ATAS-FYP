"""
Special test seeder for GetStream Chat testing
Creates a specific scenario:
- student1@gmail.com creates an event
- expert1@gmail.com is invited as a speaker (pending status)
- A conversation is created between them for testing chat functionality
"""

from app.models.event_model import (
    Event,
    EventFormat,
    EventType,
    EventRegistrationType,
    EventStatus,
    EventVisibility,
    EventRegistrationStatus,
    EventParticipant,
    EventParticipantRole,
    EventParticipantStatus,
)
from app.models.chat_model import Conversation, ConversationParticipant, Message
from app.models.user_model import User
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid


def seed_chat_test_scenario(db: Session):
    """
    Create a test scenario for chat testing:
    1. student1@gmail.com organizes an event
    2. expert1@gmail.com is invited as a speaker (pending)
    3. Conversation created with initial message
    """
    print("🚀 Starting chat test scenario seeder...")
    
    # Find the users
    student1 = db.query(User).filter(User.email == "student1@gmail.com").first()
    expert1 = db.query(User).filter(User.email == "expert1@gmail.com").first()
    
    if not student1:
        print("❌ ERROR: student1@gmail.com not found. Please run user seeder first.")
        return
    
    if not expert1:
        print("❌ ERROR: expert1@gmail.com not found. Please run user seeder first.")
        return
    
    print(f"✅ Found student1: {student1.id}")
    print(f"✅ Found expert1: {expert1.id}")
    
    # Create a test event organized by student1
    start_time = datetime.now(timezone.utc) + timedelta(days=7)  # Next week
    end_time = start_time + timedelta(hours=2)
    
    test_event = Event(
        id=uuid.uuid4(),
        organizer_id=student1.id,
        title="Tech Innovation Summit - Chat Test Event",
        description="A special event for testing the GetStream chat integration between student and expert.",
        format=EventFormat.seminar,
        type=EventType.hybrid,
        start_datetime=start_time,
        end_datetime=end_time,
        registration_type=EventRegistrationType.free,
        status=EventStatus.published,
        visibility=EventVisibility.public,
        registration_status=EventRegistrationStatus.opened,
        auto_accept_registration=False,  # Manual approval needed
        max_participant=50,
        logo_url="https://placehold.co/200x200/EF4444/fff.png?text=Chat+Test",
        cover_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop",
        venue_remark="Tech Hub Auditorium (Hybrid Event)",
        remark="Test event for GetStream chat functionality",
    )
    
    db.add(test_event)
    db.flush()
    
    print(f"✅ Created test event: {test_event.id} - '{test_event.title}'")
    
    # Add student1 as organizer participant
    organizer_participant = EventParticipant(
        id=uuid.uuid4(),
        event_id=test_event.id,
        user_id=student1.id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted,
        join_method="organizer",
        description="Event Organizer"
    )
    db.add(organizer_participant)
    
    # Create invitation for expert1 as speaker (PENDING status)
    expert_invitation = EventParticipant(
        id=uuid.uuid4(),
        event_id=test_event.id,
        user_id=expert1.id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.pending,  # Pending invitation!
        join_method="invitation",
        description="Invited as keynote speaker on AI innovation"
    )
    db.add(expert_invitation)
    db.flush()
    
    print(f"✅ Created invitation: expert1 invited to event (PENDING status)")
    print(f"   Invitation ID: {expert_invitation.id}")
    
    # Create conversation between student1 and expert1
    conversation = Conversation(
        id=uuid.uuid4()
    )
    db.add(conversation)
    db.flush()
    
    print(f"✅ Created conversation: {conversation.id}")
    
    # Add both users as conversation participants
    student_conv_participant = ConversationParticipant(
        conversation_id=conversation.id,
        user_id=student1.id
    )
    db.add(student_conv_participant)
    
    expert_conv_participant = ConversationParticipant(
        conversation_id=conversation.id,
        user_id=expert1.id
    )
    db.add(expert_conv_participant)
    
    # Link conversation to the invitation
    expert_invitation.conversation_id = conversation.id
    db.add(expert_invitation)
    
    print(f"✅ Linked conversation to invitation")
    
    # Add initial message from student1 (organizer)
    initial_message = Message(
        id=uuid.uuid4(),
        conversation_id=conversation.id,
        sender_id=student1.id,
        content="Hi! Thank you for considering our invitation to speak at the Tech Innovation Summit. We would love to have you share your expertise on AI innovation with our community. Looking forward to your response!",
        is_read=False
    )
    db.add(initial_message)
    
    # Add a reply from expert1
    reply_message = Message(
        id=uuid.uuid4(),
        conversation_id=conversation.id,
        sender_id=expert1.id,
        content="Hello! Thank you for the invitation. I'm interested in learning more about the event. Could you share more details about the expected audience and the specific topics you'd like me to cover?",
        is_read=False
    )
    db.add(reply_message)
    
    print(f"✅ Added 2 initial messages to conversation")
    
    db.commit()
    
    print("\n" + "="*70)
    print("🎉 SUCCESS! Chat test scenario created!")
    print("="*70)
    print("\n📋 Test Details:")
    print(f"   Event ID: {test_event.id}")
    print(f"   Event Title: {test_event.title}")
    print(f"   Organizer: student1@gmail.com (password: 123123)")
    print(f"   Invited Speaker: expert1@gmail.com (password: 123123)")
    print(f"   Invitation ID: {expert_invitation.id}")
    print(f"   Conversation ID: {conversation.id}")
    print(f"   GetStream Channel ID: legacy_{conversation.id}")
    print("\n🧪 How to Test:")
    print("   1. Login as expert1@gmail.com")
    print("   2. Navigate to /dashboard (invitations tab)")
    print(f"   3. Click on the invitation: '{test_event.title}'")
    print(f"   4. Open request detail: /dashboard/requests/{expert_invitation.id}")
    print("   5. Test the Communication Log (GetStream chat)")
    print("   6. Go to /messages page")
    print("   7. Verify same conversation appears there")
    print("   8. Send messages in both places - should sync in real-time!")
    print("="*70 + "\n")


if __name__ == "__main__":
    from app.database.database import SessionLocal
    db = SessionLocal()
    try:
        seed_chat_test_scenario(db)
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()
