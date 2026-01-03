from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.models.user_model import User, Role, UserStatus
from app.models.organization_model import Organization, OrganizationType, OrganizationVisibility, OrganizationStatus, organization_members
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType, EventStatus, 
    EventRegistrationStatus, EventVisibility, EventParticipant, 
    EventParticipantRole, EventParticipantStatus, EventCategory, Category, EventProposal,
    EventWalkInToken, EventChecklistItem, EventChecklistAssignment, EventPicture, EventReminder,
    EventProposalComment
)
from app.models.profile_model import Profile, ProfileVisibility, JobExperience, Education, Tag, profile_tags, profile_skills
from app.models.review_model import Review
from app.models.follows_model import Follow
from app.core.security import get_password_hash
from app.models.chat_model import Message, Conversation, ConversationParticipant
from app.models.onboarding_model import UserOnboarding
import random
import uuid

def seed_presentation_data(db: Session):
    print("Cleaning database (Presentation Mode)...")
    
    # Define available images
    available_images = ["/img/1.webp", "/img/2.png"]
    
    # Cleaning logic (Child before Parent)
    db.query(Message).delete()
    db.query(ConversationParticipant).delete()
    
    # Event dependencies cleanup
    db.query(EventChecklistAssignment).delete()
    db.query(EventChecklistItem).delete()
    db.query(EventParticipant).delete()
    db.query(EventWalkInToken).delete()
    db.query(EventPicture).delete()
    db.query(EventReminder).delete()
    db.query(EventProposalComment).delete()
    db.query(EventProposal).delete()
    db.query(Review).delete()
    db.query(EventCategory).delete()
    
    db.query(Conversation).delete()
    db.query(Event).delete()
    db.execute(organization_members.delete())
    db.query(JobExperience).delete()
    db.query(Education).delete()
    db.execute(profile_tags.delete())
    db.execute(profile_skills.delete())
    db.query(Profile).delete()
    db.query(Tag).delete()
    db.query(Organization).delete()
    db.query(Follow).delete()
    db.query(UserOnboarding).delete()
    db.query(User).delete()
    db.query(Role).delete()
    db.query(Category).delete()
    db.commit()
    print("Database cleaned.")

    # 1. Seeding Roles
    print("Seeding roles...")
    roles_list = ["student", "expert", "sponsor", "admin"]
    role_objs = {}
    for r in roles_list:
        role = Role(name=r)
        db.add(role)
        role_objs[r] = role
    db.commit()

    # 2. Seeding Categories
    print("Seeding categories...")
    cats_list = ["General IT", "Software Engineer", "Artificial Intelligence", "Blockchain", "Health", "Business"]
    cat_objs = []
    for c in cats_list:
        cat = Category(name=c)
        db.add(cat)
        cat_objs.append(cat)
    db.commit()

    # 3. Seeding Users
    print("Seeding 4 main users...")
    password = get_password_hash("123123")
    user_data = [
        ("admin", "admin@gmail.com", "Admin User", role_objs["admin"]),
        ("student", "student@gmail.com", "Student User", role_objs["student"]),
        ("expert", "expert@gmail.com", "Dr. Expert", role_objs["expert"]),
        ("sponsor", "sponsor@gmail.com", "Sponsor Rep", role_objs["sponsor"]),
        ("inactive", "inactive@gmail.com", "Inactive User", role_objs["student"]),
    ]
    
    users = {}
    for key, email, name, role in user_data:
        status = UserStatus.active
        if key == "inactive":
            status = UserStatus.inactive

        u = User(
            email=email,
            password=password,
            status=status,
            roles=[role],
            referral_code=f"REF-{key.upper()}"
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        
        # Determine visibility based on user type for testing
        visibility = ProfileVisibility.public
        if key == "student":
            visibility = ProfileVisibility.private  # Student is private to test anonymous reviews
            
        p = Profile(
            user_id=u.id,
            full_name=name,
            is_onboarded=True,
            avatar_url=random.choice(available_images),
            cover_url=random.choice(available_images),
            visibility=visibility
        )
        db.add(p)
        db.commit()
        users[key] = u

    # 4. Seeding Organization
    print("Seeding organization (APU)...")
    apu = Organization(
        owner_id=users["admin"].id,
        name="Asia Pacific University",
        description="Premier Digital Tech University",
        type=OrganizationType.university,
        status=OrganizationStatus.approved,
        visibility=OrganizationVisibility.public,
        logo_url=random.choice(available_images),
        cover_url=random.choice(available_images)
    )
    db.add(apu)
    db.commit()
    db.refresh(apu)

    # 5. Seeding Events
    print("Seeding events...")
    now = datetime.now(timezone.utc)
    events = []
    
    # --- Event 1: Past, Paid, Sponsor, Reviews (Mixed Private/Public) ---
    past_paid = Event(
        organizer_id=users["admin"].id,
        organization_id=apu.id,
        title="Tech Entrepreneurship Summit 2024",
        description="A past summit focusing on tech startups. (Paid, Sponsored, Reviewed)",
        start_datetime=now - timedelta(days=60),
        end_datetime=now - timedelta(days=60, hours=8),
        format=EventFormat.seminar,
        type=EventType.physical,
        status=EventStatus.ended,
        registration_status=EventRegistrationStatus.closed,
        registration_type=EventRegistrationType.paid,
        price=50.0,
        visibility=EventVisibility.public,
        venue_remark="Grand Hall",
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(past_paid)
    
    # --- Event 2: Past, Free, No Sponsor, No Reviews ---
    past_free = Event(
        organizer_id=users["admin"].id,
        organization_id=apu.id,
        title="Intro to Coding Workshop",
        description="A beginner friendly workshop. (Free, No Sponsor, No Reviews)",
        start_datetime=now - timedelta(days=30),
        end_datetime=now - timedelta(days=30, hours=4),
        format=EventFormat.workshop,
        type=EventType.physical,
        status=EventStatus.ended,
        registration_status=EventRegistrationStatus.closed,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        venue_remark="Lab 1",
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(past_free)

    # --- Event 3: Past, Paid, No Sponsor, Reviews ---
    past_paid_ns = Event(
        organizer_id=users["expert"].id,
        organization_id=apu.id,
        title="Advanced Python Patterns",
        description="Deep dive into Python. (Paid, No Sponsor, Reviewed)",
        start_datetime=now - timedelta(days=15),
        end_datetime=now - timedelta(days=15, hours=6),
        format=EventFormat.seminar,
        type=EventType.online,
        status=EventStatus.ended,
        registration_status=EventRegistrationStatus.closed,
        registration_type=EventRegistrationType.paid,
        price=75.0,
        visibility=EventVisibility.public,
        meeting_url="https://zoom.us/test",
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(past_paid_ns)

    # --- Event 4: Past, Free, Sponsor, No Reviews ---
    past_free_s = Event(
        organizer_id=users["admin"].id,
        organization_id=apu.id,
        title="Career Fair 2023",
        description="Meet top employers. (Free, Sponsored, No Reviews)",
        start_datetime=now - timedelta(days=90),
        end_datetime=now - timedelta(days=90, hours=8),
        format=EventFormat.other,
        type=EventType.physical,
        status=EventStatus.ended,
        registration_status=EventRegistrationStatus.closed,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        venue_remark="Campus Hall",
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(past_free_s)
    
    # --- Event 5: Future, Paid, Sponsor ---
    future_paid = Event(
        organizer_id=users["expert"].id,
        organization_id=apu.id,
        title="Advanced AI Masterclass",
        description="Upcoming deep dive into LLMs. (Paid, Sponsored)",
        start_datetime=now + timedelta(days=20),
        end_datetime=now + timedelta(days=20, hours=6),
        format=EventFormat.workshop,
        type=EventType.online,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.paid,
        price=100.0,
        visibility=EventVisibility.public,
        meeting_url="https://zoom.us/j/123456789",
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(future_paid)
    
    # --- Event 4: Ongoing, Free ---
    ongoing_free = Event(
        organizer_id=users["admin"].id,
        organization_id=apu.id,
        title="Campus Open Day",
        description="Happening right now! Come visit us.",
        start_datetime=now - timedelta(hours=2),
        end_datetime=now + timedelta(hours=6),
        format=EventFormat.club_event,
        type=EventType.physical,
        status=EventStatus.opened,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        venue_remark="Campus Grounds",
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(ongoing_free)
    
    db.add_all(events)
    db.commit()
    
    for e in events:
        db.refresh(e)
        
    # Assign categories
    db.add(EventCategory(event_id=past_paid.id, category_id=cat_objs[5].id)) # Business
    db.add(EventCategory(event_id=past_free.id, category_id=cat_objs[0].id)) # General IT
    db.add(EventCategory(event_id=past_paid_ns.id, category_id=cat_objs[1].id)) # Software Engineer
    db.add(EventCategory(event_id=past_free_s.id, category_id=cat_objs[3].id)) # Blockchain
    db.add(EventCategory(event_id=future_paid.id, category_id=cat_objs[2].id)) # AI
    db.add(EventCategory(event_id=ongoing_free.id, category_id=cat_objs[4].id)) # Health/General
    db.commit()

    # 6. Seeding Details (Sponsor, Participants, Reviews)
    print("Seeding details...")
    
    # --- For Past Paid Event (Sponsor, Reviews) ---
    # Sponsor
    db.add(EventParticipant(
        event_id=past_paid.id,
        user_id=users["sponsor"].id,
        role=EventParticipantRole.sponsor,
        status=EventParticipantStatus.accepted,
        promo_link="https://sponsor.com",
        promo_image_url="https://placehold.co/600x400?text=Sponsor+Logo"
    ))
    
    # Participants
    db.add(EventParticipant(
        event_id=past_paid.id,
        user_id=users["student"].id,
        role=EventParticipantRole.student,
        status=EventParticipantStatus.attended,
    ))
    db.add(EventParticipant(
        event_id=past_paid.id,
        user_id=users["expert"].id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.attended,
    ))
    db.commit()
    
    # Reviews
    db.add(Review(
        event_id=past_paid.id,
        reviewer_id=users["student"].id,
        reviewee_id=users["admin"].id, 
        rating=5,
        comment="Amazing event! Learned so much."
    ))
    db.add(Review(
        event_id=past_paid.id,
        reviewer_id=users["expert"].id,
        reviewee_id=users["admin"].id,
        rating=4,
        comment="Well organized, good turnout."
    ))
    
    # --- For Past Paid No Sponsor (Reviews) ---
    # Participant (Student)
    db.add(EventParticipant(
        event_id=past_paid_ns.id,
        user_id=users["student"].id,
        role=EventParticipantRole.student,
        status=EventParticipantStatus.attended,
    ))
    db.commit()
    
    # Review from Student (Private -> Anonymous)
    db.add(Review(
        event_id=past_paid_ns.id,
        reviewer_id=users["student"].id,
        reviewee_id=users["expert"].id, # Reviewing Expert (Organizer)
        rating=3,
        comment="Good content but audio was a bit low."
    ))

    # Review from Inactive User (Inactive -> Anonymous)
    db.add(Review(
        event_id=past_paid_ns.id,
        reviewer_id=users["inactive"].id,
        reviewee_id=users["expert"].id,
        rating=5,
        comment="Excellent session! (This review is from an inactive user)"
    ))
    
    # --- For Past Free Sponsor (No Reviews) ---
    # Sponsor
    db.add(EventParticipant(
        event_id=past_free_s.id,
        user_id=users["sponsor"].id,
        role=EventParticipantRole.sponsor,
        status=EventParticipantStatus.accepted,
        promo_link="https://careerexpo.com",
        promo_image_url="https://placehold.co/600x400?text=Career+Expo+Sponsor"
    ))
    db.commit()
    
    # --- For Future Paid Event ---
    # Sponsor
    db.add(EventParticipant(
        event_id=future_paid.id,
        user_id=users["sponsor"].id,
        role=EventParticipantRole.sponsor,
        status=EventParticipantStatus.accepted,
        promo_link="https://techgiant.com",
        promo_image_url="https://placehold.co/600x400?text=Tech+Giant"
    ))
    db.commit()

    print("Presentation Seeding Completed Successfully!")

if __name__ == "__main__":
    from app.database.database import SessionLocal
    db = SessionLocal()
    try:
        seed_presentation_data(db)
    finally:
        db.close()