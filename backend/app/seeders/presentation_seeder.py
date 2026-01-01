from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.models.organization_model import Organization, OrganizationType, OrganizationVisibility, OrganizationStatus
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType, EventStatus, EventVisibility, 
    EventParticipant, EventParticipantRole, EventParticipantStatus,
    EventChecklistItem, EventReminder, EventPicture, EventCategory, EventProposal
)
from app.models.onboarding_model import UserOnboarding, OnboardingStatus
from app.core.hashing import Hasher
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
import uuid
from datetime import datetime, timedelta

from app.seeders.clear_db import clear_db

def seed_presentation_data(db: Session):
    # Cleanup first using the comprehensive clear_db
    clear_db(db)

    print("Seeding presentation data...")

    # 1. Ensure Roles Exist
    roles = ["student", "expert", "teacher", "sponsor", "admin"]
    role_objects = {}
    for role_name in roles:
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name)
            db.add(role)
        role_objects[role_name] = role
    db.flush()

    # 2. Create Users
    users_data = [
        {"role": "student", "email": "student@gmail.com", "name": "Student User"},
        {"role": "expert", "email": "expert@gmail.com", "name": "Expert User"},
        {"role": "sponsor", "email": "sponsor@gmail.com", "name": "Sponsor User"},
        {"role": "teacher", "email": "teacher@gmail.com", "name": "Teacher User"},
        {"role": "admin", "email": "admin@gmail.com", "name": "Admin User"},
    ]

    created_users = {}

    for data in users_data:
        email = data["email"]
        role_name = data["role"]
        referral_code = f"REF_{role_name.upper()}_PRES"
        
        # Check by email first
        user = db.query(User).filter(User.email == email).first()
        
        # If not found by email, check by referral code (to avoid collision)
        if not user:
            user = db.query(User).filter(User.referral_code == referral_code).first()
            if user:
                print(f"User with referral code {referral_code} found, updating email to {email}...")
                user.email = email
                # Update other fields if necessary
                if user.status != UserStatus.active:
                    user.status = UserStatus.active
                db.add(user)
                db.flush()

        if not user:
            user = User(
                id=uuid.uuid4(),
                email=email,
                password=Hasher.get_password_hash("123123"),
                is_verified=True,
                status=UserStatus.active,
                referral_code=referral_code,
                referred_by=None
            )
            user.roles.append(role_objects[role_name])
            db.add(user)
            db.flush() # flush to get ID
            
            # Create Profile
            profile = Profile(
                user_id=user.id,
                full_name=data["name"],
                bio=f"I am a {role_name} for the presentation.",
                avatar_url=f"https://placehold.co/200x200/png?text={data['name'].replace(' ', '+')}",
                visibility=ProfileVisibility.public
            )
            db.add(profile)
            print(f"Created user: {email} ({role_name})")
        else:
            print(f"User {email} (or collision resolved) already exists.")
            # Ensure role is attached if not
            if role_objects[role_name] not in user.roles:
                user.roles.append(role_objects[role_name])
        
        created_users[role_name] = user

        # Ensure onboarding is completed for the user
        onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == user.id).first()
        if not onboarding:
            onboarding = UserOnboarding(
                user_id=user.id,
                status=OnboardingStatus.completed,
                current_step=5,
                total_steps=5,
                profile_completed=True,
                skills_added=True,
                interests_selected=True,
                experience_added=True,
                preferences_set=True,
                started_at=datetime.now(),
                completed_at=datetime.now()
            )
            db.add(onboarding)
            print(f"Created completed onboarding for {email}")
        else:
            if onboarding.status != OnboardingStatus.completed:
                onboarding.status = OnboardingStatus.completed
                onboarding.current_step = 5
                onboarding.profile_completed = True
                onboarding.skills_added = True
                onboarding.interests_selected = True
                onboarding.experience_added = True
                onboarding.preferences_set = True
                onboarding.completed_at = datetime.now()
                db.add(onboarding)
                print(f"Updated onboarding to completed for {email}")

    # 3. Create Organization "Asia Pacific University"
    org_name = "Asia Pacific University"
    org = db.query(Organization).filter(Organization.name == org_name).first()
    
    # Decide owner: Use the Admin or Teacher
    owner = created_users.get("admin") or created_users.get("teacher")
    if not owner:
        # Fallback if for some reason they weren't created/found
        owner = db.query(User).first()

    if not org:
        org = Organization(
            id=uuid.uuid4(),
            owner_id=owner.id,
            name=org_name,
            description="Asia Pacific University of Technology & Innovation (APU) is amongst Malaysia's Premier Private Universities.",
            type=OrganizationType.university,
            visibility=OrganizationVisibility.public,
            status=OrganizationStatus.approved,
            logo_url="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/APU_Logo.png/640px-APU_Logo.png", # Example placeholder
            location="Kuala Lumpur, Malaysia",
            website_url="https://www.apu.edu.my"
        )
        db.add(org)
        print(f"Created Organization: {org_name}")
    else:
        print(f"Organization {org_name} already exists.")

    db.flush()

    # 4. Seed Events for APU (linked via owner)
    print("Seeding events for APU...")
    
    # 4.1 Physical Event: APU Hackathon 2024
    hackathon = db.query(Event).filter(Event.title == "APU Hackathon 2024", Event.organizer_id == owner.id).first()
    if not hackathon:
        hackathon = Event(
            id=uuid.uuid4(),
            organizer_id=owner.id,
            title="APU Hackathon 2024",
            description="Join the biggest hackathon in APU! 24 hours of coding, networking and fun. Open to all students and experts.",
            format=EventFormat.workshop,
            type=EventType.physical,
            start_datetime=datetime.now() + timedelta(days=7),
            end_datetime=datetime.now() + timedelta(days=8),
            registration_type=EventRegistrationType.free,
            status=EventStatus.published,
            visibility=EventVisibility.public,
            venue_place_id="APU Campus",
            venue_remark="Auditorium 1",
            max_participant=100,
            cover_url="https://images.unsplash.com/photo-1504384308090-c54be3855833?q=80&w=2662&auto=format&fit=crop",
            auto_accept_registration=True,
            is_attendance_enabled=True
        )
        db.add(hackathon)
        db.flush()
        print("Created Physical Event: APU Hackathon 2024")
    
    # 4.2 Online Event: Future of AI Webinar
    webinar = db.query(Event).filter(Event.title == "Future of AI Webinar", Event.organizer_id == owner.id).first()
    if not webinar:
        webinar = Event(
            id=uuid.uuid4(),
            organizer_id=owner.id,
            title="Future of AI Webinar",
            description="Explore the latest trends in Artificial Intelligence with industry experts. Join us online!",
            format=EventFormat.webinar,
            type=EventType.online,
            start_datetime=datetime.now() + timedelta(days=10),
            end_datetime=datetime.now() + timedelta(days=10, hours=2),
            registration_type=EventRegistrationType.free,
            status=EventStatus.published,
            visibility=EventVisibility.public,
            meeting_url="https://meet.google.com/abc-defg-hij",
            max_participant=500,
            cover_url="https://images.unsplash.com/photo-1614064641938-3bcee52636cd?q=80&w=2670&auto=format&fit=crop",
            auto_accept_registration=True,
            is_attendance_enabled=True
        )
        db.add(webinar)
        db.flush()
        print("Created Online Event: Future of AI Webinar")

    # 5. Add Participants (Walk-in)
    if hackathon:
        p1 = db.query(EventParticipant).filter(EventParticipant.event_id == hackathon.id, EventParticipant.email == "walkin1@example.com").first()
        if not p1:
            p1 = EventParticipant(
                event_id=hackathon.id,
                user_id=None, # Walk-in
                name="Walkin User One",
                email="walkin1@example.com",
                role=EventParticipantRole.audience,
                status=EventParticipantStatus.accepted,
                join_method="walk_in"
            )
            db.add(p1)
            print("Added Walk-in Participant 1 to Hackathon")

    if webinar:
        p2 = db.query(EventParticipant).filter(EventParticipant.event_id == webinar.id, EventParticipant.email == "onlineuser@example.com").first()
        if not p2:
            p2 = EventParticipant(
                event_id=webinar.id,
                user_id=None, # Walk-in
                name="Online User One",
                email="onlineuser@example.com",
                role=EventParticipantRole.audience,
                status=EventParticipantStatus.accepted,
                join_method="walk_in"
            )
            db.add(p2)
            print("Added Participant to Webinar")

    # 6. Seed Past Events (Sponsored)
    print("Seeding past sponsored events...")
    sponsor_user = created_users.get("sponsor")
    if sponsor_user:
        # 6.1 Past Tech Summit
        tech_summit = db.query(Event).filter(Event.title == "Tech Summit 2023", Event.organizer_id == owner.id).first()
        if not tech_summit:
            tech_summit = Event(
                id=uuid.uuid4(),
                organizer_id=owner.id,
                title="Tech Summit 2023",
                description="The biggest tech summit of last year. Featuring top industry leaders.",
                format=EventFormat.seminar,
                type=EventType.physical,
                start_datetime=datetime.now() - timedelta(days=365),
                end_datetime=datetime.now() - timedelta(days=364),
                registration_type=EventRegistrationType.free,
                status=EventStatus.completed,
                visibility=EventVisibility.public,
                venue_place_id="KLCC Convention Centre",
                venue_remark="Hall 1",
                max_participant=1000,
                cover_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop"
            )
            db.add(tech_summit)
            db.flush()
            
            # Add Sponsor Participant
            sponsor_p1 = EventParticipant(
                event_id=tech_summit.id,
                user_id=sponsor_user.id,
                role=EventParticipantRole.sponsor,
                status=EventParticipantStatus.accepted,
                join_method="invite",
                promo_link="https://www.google.com",
                promo_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/2560px-Google_2015_logo.svg.png"
            )
            db.add(sponsor_p1)
            print("Created Past Event: Tech Summit 2023 (Sponsored)")

        # 6.2 Past AI Workshop
        ai_workshop = db.query(Event).filter(Event.title == "AI Workshop 2023", Event.organizer_id == owner.id).first()
        if not ai_workshop:
            ai_workshop = Event(
                id=uuid.uuid4(),
                organizer_id=owner.id,
                title="AI Workshop 2023",
                description="Hands-on AI workshop from last year.",
                format=EventFormat.workshop,
                type=EventType.online,
                start_datetime=datetime.now() - timedelta(days=200),
                end_datetime=datetime.now() - timedelta(days=200, hours=4),
                registration_type=EventRegistrationType.free,
                status=EventStatus.completed,
                visibility=EventVisibility.public,
                meeting_url="https://zoom.us/j/123456789",
                max_participant=50,
                cover_url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2670&auto=format&fit=crop"
            )
            db.add(ai_workshop)
            db.flush()

            # Add Sponsor Participant
            sponsor_p2 = EventParticipant(
                event_id=ai_workshop.id,
                user_id=sponsor_user.id,
                role=EventParticipantRole.sponsor,
                status=EventParticipantStatus.accepted,
                join_method="invite",
                promo_link="https://www.microsoft.com",
                promo_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/2560px-Microsoft_logo_%282012%29.svg.png"
            )
            db.add(sponsor_p2)
            print("Created Past Event: AI Workshop 2023 (Sponsored)")

        # 6.3 Past Cloud Computing Conference
        cloud_conf = db.query(Event).filter(Event.title == "Cloud Computing Conference 2023", Event.organizer_id == owner.id).first()
        if not cloud_conf:
            cloud_conf = Event(
                id=uuid.uuid4(),
                organizer_id=owner.id,
                title="Cloud Computing Conference 2023",
                description="Everything about Cloud Computing trends and technologies.",
                format=EventFormat.seminar,
                type=EventType.physical,
                start_datetime=datetime.now() - timedelta(days=150),
                end_datetime=datetime.now() - timedelta(days=149),
                registration_type=EventRegistrationType.paid,
                status=EventStatus.completed,
                visibility=EventVisibility.public,
                venue_place_id="APU Main Hall",
                venue_remark="Level 3",
                max_participant=300,
                cover_url="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop"
            )
            db.add(cloud_conf)
            db.flush()

            # Add Sponsor Participant
            sponsor_p3 = EventParticipant(
                event_id=cloud_conf.id,
                user_id=sponsor_user.id,
                role=EventParticipantRole.sponsor,
                status=EventParticipantStatus.accepted,
                join_method="invite",
                promo_link="https://aws.amazon.com",
                promo_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/2560px-Amazon_Web_Services_Logo.svg.png"
            )
            db.add(sponsor_p3)
            print("Created Past Event: Cloud Computing Conference 2023 (Sponsored)")

        # 6.4 Past Events Loop (To reach Gold Tier > 10 events)
        print("Seeding bulk past events for Gold Tier...")
        for i in range(1, 15): # Create 14 more events to be safe
            past_event_title = f"Past Tech Conference {2020 + (i % 4)} - Ed. {i}"
            p_event = db.query(Event).filter(Event.title == past_event_title, Event.organizer_id == owner.id).first()
            if not p_event:
                p_event = Event(
                    id=uuid.uuid4(),
                    organizer_id=owner.id,
                    title=past_event_title,
                    description=f"A great past event from history edition {i}.",
                    format=EventFormat.seminar,
                    type=EventType.physical,
                    start_datetime=datetime.now() - timedelta(days=400 + i*10),
                    end_datetime=datetime.now() - timedelta(days=399 + i*10),
                    registration_type=EventRegistrationType.free,
                    status=EventStatus.completed,
                    visibility=EventVisibility.public,
                    venue_place_id="APU Auditorium",
                    venue_remark=f"Room {i}",
                    max_participant=200,
                    cover_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop"
                )
                db.add(p_event)
                db.flush()

                # Add Sponsor Participant
                sponsor_p = EventParticipant(
                    event_id=p_event.id,
                    user_id=sponsor_user.id,
                    role=EventParticipantRole.sponsor,
                    status=EventParticipantStatus.accepted,
                    join_method="invite",
                    promo_link="https://www.google.com",
                    promo_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/2560px-Google_2015_logo.svg.png"
                )
                db.add(sponsor_p)
        print("Created Bulk Past Events for Gold Tier")

    db.commit()

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_presentation_data(db)
    finally:
        db.close()
