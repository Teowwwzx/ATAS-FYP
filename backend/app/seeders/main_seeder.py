from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.models.user_model import User, Role, UserStatus
from app.models.organization_model import Organization, OrganizationType, OrganizationVisibility, OrganizationStatus, organization_members
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType, EventStatus, 
    EventRegistrationStatus, EventVisibility, EventParticipant, 
    EventParticipantRole, EventParticipantStatus, EventProposal, 
    EventPaymentStatus, EventCategory, Category
)
from app.models.review_model import Review
from app.models.onboarding_model import UserOnboarding, OnboardingStatus
from app.models.chat_model import Conversation, ConversationParticipant, Message
from app.core.security import get_password_hash
from app.models.profile_model import Profile, JobExperience, Education, Tag, profile_tags, profile_skills
from app.models.follows_model import Follow
import random

def seed_main_data(db: Session):
    print("Cleaning database (Main Mode)...")
    
    # Define available images
    available_images = ["/img/1.webp", "/img/2.png"]
    
    # Cleaning Logic
    db.query(Message).delete()
    db.query(ConversationParticipant).delete()
    db.query(EventParticipant).delete()
    db.query(Review).delete()
    db.query(EventProposal).delete()
    db.query(EventCategory).delete()
    db.query(Category).delete()
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
    cats_list = ["Technology", "Business", "Design", "Health & Wellness", "Arts & Culture", "Science", "Education", "Social"]
    cat_objs = []
    for c in cats_list:
        cat = Category(name=c)
        db.add(cat)
        cat_objs.append(cat)
    db.commit()

    # 3. Seeding Users
    print("Seeding users...")
    password = get_password_hash("password123")
    user_data = [
        ("admin", "admin@atas.com", "Admin User", role_objs["admin"]),
        ("student", "student@atas.com", "Student User", role_objs["student"]),
        ("expert", "expert@atas.com", "Dr. Expert", role_objs["expert"]),
        ("sponsor", "sponsor@atas.com", "Sponsor Rep", role_objs["sponsor"]),
        ("friend", "friend@atas.com", "Friend User", role_objs["student"]),
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

    # 4. Seeding Friends
    print("Seeding friends (follows)...")
    db.add(Follow(follower_id=users["student"].id, followee_id=users["expert"].id))
    db.add(Follow(follower_id=users["student"].id, followee_id=users["friend"].id))
    db.add(Follow(follower_id=users["friend"].id, followee_id=users["student"].id))
    db.commit()

    # 5. Seeding Onboarding
    print("Seeding onboarding intent...")
    for key, user in users.items():
        onboarding = UserOnboarding(
            user_id=user.id,
            status=OnboardingStatus.completed,
            current_step=5,
            profile_completed=True,
            skills_added=True,
            interests_selected=True,
            onboarding_data={"goals": ["networking", "learning"], "interests": ["Tech", "AI"]}
        )
        db.add(onboarding)
    db.commit()

    # 6. Seeding Organizations
    print("Seeding organizations...")
    orgs = {
        "apu": Organization(
            owner_id=users["admin"].id,
            name="Asia Pacific University",
            description="Premier Digital Tech University",
            type=OrganizationType.university,
            status=OrganizationStatus.approved,
            visibility=OrganizationVisibility.public,
            logo_url=random.choice(available_images),
            cover_url=random.choice(available_images)
        ),
        "tech_corp": Organization(
            owner_id=users["sponsor"].id,
            name="Tech Corp Global",
            description="Leading innovation in AI",
            type=OrganizationType.company,
            status=OrganizationStatus.approved,
            visibility=OrganizationVisibility.public,
            logo_url=random.choice(available_images),
            cover_url=random.choice(available_images)
        )
    }
    for o in orgs.values():
        db.add(o)
    db.commit()
    for k, o in orgs.items():
        db.refresh(o)

    # 7. Seeding Events
    print("Seeding events...")
    now = datetime.now(timezone.utc)
    events = []
    
    # Incoming Event
    incoming = Event(
        organizer_id=users["admin"].id,
        organization_id=orgs["apu"].id,
        title="APU Mega Career Fair 2025",
        description="Join us for the biggest career fair of the year.",
        start_datetime=now + timedelta(days=10),
        end_datetime=now + timedelta(days=10, hours=4),
        format=EventFormat.seminar,
        type=EventType.physical,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        venue_remark="APU Campus, Bukit Jalil",
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(incoming)
    
    # Past Event
    past = Event(
        organizer_id=users["sponsor"].id,
        organization_id=orgs["tech_corp"].id,
        title="AI Summit 2024",
        description="A look back at AI advancements.",
        start_datetime=now - timedelta(days=30),
        end_datetime=now - timedelta(days=30, hours=4),
        format=EventFormat.panel_discussion,
        type=EventType.hybrid,
        status=EventStatus.completed,
        registration_status=EventRegistrationStatus.closed,
        registration_type=EventRegistrationType.paid,
        price=50.0,
        visibility=EventVisibility.public,
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(past)
    
    # Friend's Event
    friend_event = Event(
        organizer_id=users["friend"].id,
        title="Casual Coding Meetup",
        description="Let's code together.",
        start_datetime=now + timedelta(days=2),
        end_datetime=now + timedelta(days=2, hours=2),
        format=EventFormat.club_event,
        type=EventType.physical,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(friend_event)
    
    # Booking Event (for incoming logic test)
    booking_event = Event(
        organizer_id=users["expert"].id,
        title="Expert Consultation",
        description="One on one.",
        start_datetime=now + timedelta(days=5),
        end_datetime=now + timedelta(days=5, hours=1),
        format=EventFormat.other,
        type=EventType.online,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        cover_url=random.choice(available_images),
        logo_url=random.choice(available_images)
    )
    events.append(booking_event)

    
    db.add_all(events)
    db.commit()
    
    for e in events:
        db.refresh(e)
        
    # Assign categories (using cat_objs list, indices: Tech(0), Business(1), Design(2), Health(3), Arts(4), Science(5), Education(6), Social(7))
    # Incoming: Tech(0), Education(6)
    db.add(EventCategory(event_id=incoming.id, category_id=cat_objs[0].id))
    db.add(EventCategory(event_id=incoming.id, category_id=cat_objs[6].id))
    
    # Past: Tech(0), Science(5)
    db.add(EventCategory(event_id=past.id, category_id=cat_objs[0].id))
    db.add(EventCategory(event_id=past.id, category_id=cat_objs[5].id))
    
    # Friend: Tech(0)
    db.add(EventCategory(event_id=friend_event.id, category_id=cat_objs[0].id))
    db.commit()
    
    events_dict = {"incoming": incoming, "past": past, "friend": friend_event}

    # 8. Seeding Details
    print("Seeding event details (sponsors, reviews)...")
    # Sponsor for Past Event
    sponsor_part = EventParticipant(
        event_id=past.id,
        user_id=users["sponsor"].id,
        role=EventParticipantRole.sponsor,
        status=EventParticipantStatus.accepted,
        promo_link="https://techcorp.com",
        promo_image_url="https://placehold.co/600x400?text=Sponsor+Ad"
    )
    db.add(sponsor_part)
    
    # Review for Past Event
    review = Review(
        event_id=past.id,
        reviewer_id=users["student"].id,
        reviewee_id=users["sponsor"].id,
        rating=5,
        comment="Amazing event! Learned so much."
    )
    db.add(review)
    db.commit()

    # 9. Seeding Booking
    print("Seeding booking (Student books Expert)...")
    booking_event = Event(
        organizer_id=users["student"].id,
        title="Career Consultation",
        description="1-on-1 session",
        format=EventFormat.other,
        type=EventType.online,
        start_datetime=now + timedelta(days=3),
        end_datetime=now + timedelta(days=3, hours=1),
        visibility=EventVisibility.private,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.closed,
        registration_type=EventRegistrationType.free,
        max_participant=2
    )
    db.add(booking_event)
    db.commit()
    db.refresh(booking_event)
    
    db.add(EventParticipant(
        event_id=booking_event.id,
        user_id=users["student"].id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted
    ))
    db.add(EventParticipant(
        event_id=booking_event.id,
        user_id=users["expert"].id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.pending
    ))
    
    # Conversation
    conv = Conversation()
    db.add(conv)
    db.commit()
    db.refresh(conv)
    
    db.add(ConversationParticipant(conversation_id=conv.id, user_id=users["student"].id))
    db.add(ConversationParticipant(conversation_id=conv.id, user_id=users["expert"].id))
    
    msg = Message(
        conversation_id=conv.id,
        sender_id=users["student"].id,
        content="Hi Dr. Expert, I would like to discuss my career path."
    )
    db.add(msg)
    db.commit()

    # 10. Seeding Invitation
    print("Seeding invitation with proposal...")
    proposal = EventProposal(
        event_id=incoming.id,
        created_by_user_id=users["student"].id,
        title="Student Innovation Talk",
        description="I want to share my FYP project.",
        file_url="http://example.com/proposal.pdf"
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    
    invite = EventParticipant(
        event_id=incoming.id,
        user_id=users["student"].id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.pending,
        join_method="invited",
        proposal_id=proposal.id
    )
    db.add(invite)
    db.commit()

    print("Main Seeding Completed Successfully!")
