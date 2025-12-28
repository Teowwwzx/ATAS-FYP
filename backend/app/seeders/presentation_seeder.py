from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.models.organization_model import Organization, OrganizationType, OrganizationVisibility, OrganizationStatus
from app.models.event_model import Event, EventFormat, EventType, EventRegistrationType, EventStatus, EventVisibility, EventParticipant, EventParticipantRole, EventParticipantStatus
from app.models.onboarding_model import UserOnboarding, OnboardingStatus
from app.core.hashing import Hasher
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
import uuid
from datetime import datetime, timedelta

def seed_presentation_data(db: Session):
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
    
    # 4.1 Hackathon
    hackathon = db.query(Event).filter(Event.title == "APU Hackathon 2024", Event.organizer_id == owner.id).first()
    if not hackathon:
        hackathon = Event(
            id=uuid.uuid4(),
            organizer_id=owner.id,
            title="APU Hackathon 2024",
            description="Join the biggest hackathon in APU! 24 hours of coding, networking and fun. Open to all students and experts.",
            format=EventFormat.workshop, # Using workshop as closest match or 'other'
            type=EventType.offline,
            start_datetime=datetime.now() + timedelta(days=7),
            end_datetime=datetime.now() + timedelta(days=8),
            registration_type=EventRegistrationType.free,
            status=EventStatus.published,
            visibility=EventVisibility.public,
            venue_place_id="APU Campus",
            venue_remark="Auditorium 1",
            max_participant=100,
            cover_url="https://images.unsplash.com/photo-1504384308090-c54be3855833?q=80&w=2576&auto=format&fit=crop"
        )
        db.add(hackathon)
        db.flush()
        print("Created Event: APU Hackathon 2024")
    
    # 4.2 Club Event
    club_event = db.query(Event).filter(Event.title == "Coding Club Weekly Meetup", Event.organizer_id == owner.id).first()
    if not club_event:
        club_event = Event(
            id=uuid.uuid4(),
            organizer_id=owner.id,
            title="Coding Club Weekly Meetup",
            description="Weekly meetup for the APU Coding Club. Let's discuss algorithms and data structures.",
            format=EventFormat.club_event,
            type=EventType.offline,
            start_datetime=datetime.now() + timedelta(days=2),
            end_datetime=datetime.now() + timedelta(days=2, hours=2),
            registration_type=EventRegistrationType.free,
            status=EventStatus.published,
            visibility=EventVisibility.public,
            venue_place_id="APU Campus",
            venue_remark="Lab 4",
            cover_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2670&auto=format&fit=crop"
        )
        db.add(club_event)
        db.flush()
        print("Created Event: Coding Club Weekly Meetup")

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

    if club_event:
        p2 = db.query(EventParticipant).filter(EventParticipant.event_id == club_event.id, EventParticipant.email == "walkin2@example.com").first()
        if not p2:
            p2 = EventParticipant(
                event_id=club_event.id,
                user_id=None, # Walk-in
                name="Walkin User Two",
                email="walkin2@example.com",
                role=EventParticipantRole.student,
                status=EventParticipantStatus.accepted,
                join_method="walk_in"
            )
            db.add(p2)
            print("Added Walk-in Participant 2 to Club Event")

    db.commit()
    print("Presentation data seeded successfully!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_presentation_data(db)
    finally:
        db.close()
