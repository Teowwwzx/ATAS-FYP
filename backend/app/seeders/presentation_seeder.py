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
from app.models.profile_model import Profile, JobExperience, Education, Tag, profile_tags, profile_skills
from app.models.review_model import Review
from app.models.follows_model import Follow
from app.core.security import get_password_hash
from app.models.chat_model import Message, Conversation, ConversationParticipant
from app.models.onboarding_model import UserOnboarding
import random

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
    ]
    
    users = {}
    for key, email, name, role in user_data:
        u = User(
            email=email,
            password=password,
            status=UserStatus.active,
            roles=[role],
            referral_code=f"REF-{key.upper()}"
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        
        p = Profile(
            user_id=u.id,
            full_name=name,
            is_onboarded=True,
            avatar_url=random.choice(available_images),
            cover_url=random.choice(available_images)
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
    print("Seeding events (1 Online, 1 Physical, 1 Past)...")
    now = datetime.now(timezone.utc)
    events = []
    
    # Online Event
    online = Event(
        organizer_id=users["expert"].id,
        organization_id=apu.id,
        title="Future of AI (Online Webinar)",
        description="Deep dive into AI trends.",
        start_datetime=now + timedelta(days=5),
        end_datetime=now + timedelta(days=5, hours=2),
        format=EventFormat.webinar,
        type=EventType.online,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(online)
    
    # Physical Event
    physical = Event(
        organizer_id=users["admin"].id,
        organization_id=apu.id,
        title="Campus Hackathon 2025",
        description="24-hour coding challenge.",
        start_datetime=now + timedelta(days=15),
        end_datetime=now + timedelta(days=16),
        format=EventFormat.workshop,
        type=EventType.physical,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        venue_remark="APU Atrium",
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(physical)
    
    # Past Event
    past = Event(
        organizer_id=users["admin"].id,
        organization_id=apu.id,
        title="Startup Showcase 2024",
        description="Previous year's showcase.",
        start_datetime=now - timedelta(days=60),
        end_datetime=now - timedelta(days=60, hours=5),
        format=EventFormat.seminar,
        type=EventType.physical,
        status=EventStatus.completed,
        registration_status=EventRegistrationStatus.closed,
        registration_type=EventRegistrationType.paid,
        price=10.0,
        visibility=EventVisibility.public,
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(past)
    
    db.add_all(events)
    db.commit()
    
    for e in events:
        db.refresh(e)
        
    # Assign categories
    # Online: AI (2)
    db.add(EventCategory(event_id=online.id, category_id=cat_objs[2].id))
    # Physical: General IT (0), Software Engineer (1)
    db.add(EventCategory(event_id=physical.id, category_id=cat_objs[0].id))
    db.add(EventCategory(event_id=physical.id, category_id=cat_objs[1].id))
    # Past: Business (5)
    db.add(EventCategory(event_id=past.id, category_id=cat_objs[5].id))
    db.commit()

    # 6. Seeding Details (Sponsor, Review)
    print("Seeding sponsor and review for past event...")
    # Sponsor for Past Event
    db.add(EventParticipant(
        event_id=past.id,
        user_id=users["sponsor"].id,
        role=EventParticipantRole.sponsor,
        status=EventParticipantStatus.accepted,
        promo_link="https://sponsor.com",
        promo_image_url="https://placehold.co/600x400?text=Sponsor+Logo"
    ))
    
    # Review for Past Event
    db.add(Review(
        event_id=past.id,
        reviewer_id=users["student"].id,
        reviewee_id=users["admin"].id,
        rating=4,
        comment="Great exposure for startups!"
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
