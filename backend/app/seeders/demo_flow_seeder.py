from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid
import random
from app.models.user_model import User
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType, EventStatus, 
    EventVisibility, EventRegistrationStatus, EventParticipant, 
    EventParticipantRole, EventParticipantStatus
)
from app.models.organization_model import Organization

def seed_demo_flow(db: Session):
    print("Seeding demo flow (Student invites Expert)...")
    
    # 1. Fetch Users
    student = db.query(User).filter(User.email == "student@gmail.com").first()
    expert = db.query(User).filter(User.email == "expert@gmail.com").first()
    sponsor = db.query(User).filter(User.email == "sponsor@gmail.com").first()
    
    if not student or not expert or not sponsor:
        print("Error: Required users (student, expert, sponsor) not found. Please run presentation_seeder first.")
        return

    # Fetch APU Organization (for affiliation if needed, though we'll keep these personal/student-org for now)
    apu = db.query(Organization).filter(Organization.name == "Asia Pacific University").first()

    now = datetime.now(timezone.utc)
    
    # --- Scenario A: Student Organizing Events ---
    print(f"Creating events organized by {student.full_name}...")
    
    student_events_data = [
        {
            "title": "FYP Final Demonstration",
            "desc": "Final year project demonstration session for feedback.",
            "type": EventType.physical,
            "format": EventFormat.seminar,
            "start": now + timedelta(days=5),
            "invite_expert_role": EventParticipantRole.speaker, # Expert invited as Judge/Speaker
            "invite_sponsor_role": None
        },
        {
            "title": "Student Coding Club Meetup",
            "desc": "Weekly gathering of the coding club to discuss algorithms.",
            "type": EventType.physical,
            "format": EventFormat.club_event,
            "start": now + timedelta(days=3),
            "invite_expert_role": EventParticipantRole.audience, # Expert invited as Guest
            "invite_sponsor_role": EventParticipantRole.sponsor # Sponsor invited
        },
        {
            "title": "Campus AI Workshop 2026",
            "desc": "A workshop organized by students for students.",
            "type": EventType.physical,
            "format": EventFormat.workshop,
            "start": now + timedelta(days=10),
            "invite_expert_role": EventParticipantRole.speaker,
            "invite_sponsor_role": EventParticipantRole.sponsor
        }
    ]
    
    for data in student_events_data:
        event = Event(
            id=uuid.uuid4(),
            organizer_id=student.id,
            organization_id=apu.id if apu else None, # Affiliated with APU
            title=data["title"],
            description=data["desc"],
            format=data["format"],
            type=data["type"],
            status=EventStatus.published,
            registration_status=EventRegistrationStatus.opened,
            registration_type=EventRegistrationType.free,
            visibility=EventVisibility.public,
            start_datetime=data["start"],
            end_datetime=data["start"] + timedelta(hours=3),
            cover_url="/img/events/1.webp",
            logo_url="/img/events/2.png",
            created_at=now,
            updated_at=now
        )
        db.add(event)
        db.flush()
        
        # Add Student as Organizer (Accepted)
        db.add(EventParticipant(
            event_id=event.id,
            user_id=student.id,
            role=EventParticipantRole.organizer,
            status=EventParticipantStatus.accepted,
            join_method="seed"
        ))
        
        # Invite Expert
        if data["invite_expert_role"]:
            print(f"  -> Inviting Expert to '{data['title']}' as {data['invite_expert_role'].value}...")
            db.add(EventParticipant(
                event_id=event.id,
                user_id=expert.id,
                role=data["invite_expert_role"],
                status=EventParticipantStatus.pending, # PENDING state for demo
                join_method="invited"
            ))
            
        # Invite Sponsor
        if data["invite_sponsor_role"]:
            print(f"  -> Inviting Sponsor to '{data['title']}' as {data['invite_sponsor_role'].value}...")
            db.add(EventParticipant(
                event_id=event.id,
                user_id=sponsor.id,
                role=data["invite_sponsor_role"],
                status=EventParticipantStatus.pending,
                join_method="invited",
                promo_link="https://sponsor.com" if data["invite_sponsor_role"] == EventParticipantRole.sponsor else None
            ))
            
    # --- Scenario B: Expert Organizing Event (Inviting Student) ---
    print(f"Creating event organized by {expert.full_name}...")
    expert_event = Event(
        id=uuid.uuid4(),
        organizer_id=expert.id,
        organization_id=apu.id if apu else None,
        title="Advanced Research Methodologies",
        description="A deep dive into research methods for final year students.",
        format=EventFormat.seminar,
        type=EventType.online,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        start_datetime=now + timedelta(days=7),
        end_datetime=now + timedelta(days=7, hours=2),
        cover_url="/img/events/3.png",
        logo_url="/img/events/1.webp",
        meeting_url="https://zoom.us/j/demo123",
        created_at=now,
        updated_at=now
    )
    db.add(expert_event)
    db.flush()
    
    # Expert as Organizer
    db.add(EventParticipant(
        event_id=expert_event.id,
        user_id=expert.id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted,
        join_method="seed"
    ))
    
    # Invite Student as Committee (to help organize)
    print(f"  -> Inviting Student to '{expert_event.title}' as Committee...")
    db.add(EventParticipant(
        event_id=expert_event.id,
        user_id=student.id,
        role=EventParticipantRole.committee,
        status=EventParticipantStatus.pending,
        join_method="invited"
    ))

    # --- Scenario C: Sponsor Organizing Event (Inviting Expert) ---
    print(f"Creating event organized by {sponsor.full_name}...")
    sponsor_event = Event(
        id=uuid.uuid4(),
        organizer_id=sponsor.id,
        title="Tech Career Fair 2026",
        description="Meet the top tech companies in the region.",
        format=EventFormat.other,
        type=EventType.physical,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.opened,
        registration_type=EventRegistrationType.free,
        visibility=EventVisibility.public,
        start_datetime=now + timedelta(days=14),
        end_datetime=now + timedelta(days=14, hours=8),
        cover_url="/img/sponsor/cover.jpg",
        logo_url="/img/sponsor/logo.jpg",
        venue_remark="Exhibition Center",
        created_at=now,
        updated_at=now
    )
    db.add(sponsor_event)
    db.flush()
    
    # Sponsor as Organizer
    db.add(EventParticipant(
        event_id=sponsor_event.id,
        user_id=sponsor.id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted,
        join_method="seed"
    ))
    
    # Invite Expert as Speaker
    print(f"  -> Inviting Expert to '{sponsor_event.title}' as Speaker...")
    db.add(EventParticipant(
        event_id=sponsor_event.id,
        user_id=expert.id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.pending,
        join_method="invited"
    ))

    db.commit()
    print("Demo flow seeding completed successfully!")
    print("----------------------------------------------------------------")
    print("Added:")
    print(f"1. 3 Events organized by Student ({student.email})")
    print(f"2. Invitations for Expert ({expert.email}) to these events")
    print(f"3. Invitations for Sponsor ({sponsor.email}) to these events")
    print(f"4. 1 Event organized by Expert, inviting Student")
    print(f"5. 1 Event organized by Sponsor, inviting Expert")
    print("----------------------------------------------------------------")

if __name__ == "__main__":
    from app.database.database import SessionLocal
    db = SessionLocal()
    try:
        seed_demo_flow(db)
    finally:
        db.close()
