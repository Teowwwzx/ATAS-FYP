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
    EventCategory,
    Category,
    EventProposal,
    EventProposalComment,
    EventReminder,
    EventChecklistItem,
)
from app.models.user_model import User
from faker import Faker
import uuid
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.sql import func

fake = Faker()

def seed_events(db, num_events=20):
    """Seed events table with fake data"""
    print(f"Seeding {num_events} events...")
    
    # Ensure some categories exist
    default_categories = [
        "ai", "ml", "data_science", "hackathon", "meetup", "education", "career", "research", "community", "startup"
    ]
    for name in default_categories:
        if not db.query(Category).filter(Category.name == name).first():
            db.add(Category(id=uuid.uuid4(), name=name))
    db.flush()

    # Get all users to assign as organizers
    users = db.query(User.id).all()
    
    if not users:
        print("No users found. Please seed users first.")
        return
    
    for _ in range(num_events):
        # Random start time between now and 30 days in the future or past
        offset_days = random.randint(-15, 30)
        start_time = datetime.now(timezone.utc) + timedelta(days=offset_days)
        # Event duration between 1 and 4 hours
        end_time = start_time + timedelta(hours=random.randint(1, 4))
        
        organizer = random.choice(users)
        
        # Lifecycle and registration defaults
        status_choice = EventStatus.published if start_time > datetime.now(timezone.utc) else EventStatus.ended
        # Small portion remain as drafts
        if random.random() < 0.2:
            status_choice = EventStatus.draft

        event = Event(
            id=uuid.uuid4(),
            organizer_id=organizer.id,
            title=fake.sentence(nb_words=6),
            description=fake.paragraph(nb_sentences=3),
            format=random.choice(list(EventFormat)),
            type=random.choice(list(EventType)),
            start_datetime=start_time,
            end_datetime=end_time,
            registration_type=random.choice(list(EventRegistrationType)),
            status=status_choice,
            visibility=random.choice(list(EventVisibility)),
            registration_status=EventRegistrationStatus.opened,
            auto_accept_registration=True,
            max_participant=random.randint(10, 100) if random.random() > 0.3 else None,
            logo_url=fake.image_url(),
            cover_url=fake.image_url(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(event)
        db.flush()

        # Link organizer as participant (accepted)
        org_link = EventParticipant(
            event_id=event.id,
            user_id=organizer.id,
            role=EventParticipantRole.organizer,
            status=EventParticipantStatus.accepted,
            join_method="seed",
        )
        db.add(org_link)

        # Add categories (1-2)
        choose = list(db.query(Category).all())
        for cat in random.sample(choose, k=random.randint(1, min(2, len(choose)))):
            db.add(EventCategory(event_id=event.id, category_id=cat.id))

        # Add participants
        others = [u for u in users if u.id != organizer.id]
        num_participants = random.randint(3, 15)
        picked = random.sample(others, k=min(num_participants, len(others)))
        for item in picked:
            role = random.choices(
                population=[EventParticipantRole.audience, EventParticipantRole.committee, EventParticipantRole.speaker],
                weights=[70, 20, 10],
                k=1,
            )[0]
            status = random.choices(
                population=[EventParticipantStatus.accepted, EventParticipantStatus.pending],
                weights=[80, 20],
                k=1,
            )[0]
            db.add(EventParticipant(
                event_id=event.id,
                user_id=item.id,
                role=role,
                status=status,
                join_method="seed",
            ))

        # Add proposals from speakers or organizer
        speaker_ids = [p.user_id for p in db.query(EventParticipant).filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role == EventParticipantRole.speaker
        ).all()]
        creators = speaker_ids if speaker_ids else [organizer.id]
        for _ in range(random.randint(0, 3)):
            creator_id = random.choice(creators)
            proposal = EventProposal(
                event_id=event.id,
                created_by_user_id=creator_id,
                title=fake.sentence(nb_words=4),
                description=fake.paragraph(nb_sentences=2),
                file_url=fake.image_url() if random.random() < 0.3 else None,
            )
            db.add(proposal)
            db.flush()
            # Add comments
            for _c in range(random.randint(0, 3)):
                commenter = random.choice(picked).id if picked else organizer.id
                db.add(EventProposalComment(
                    proposal_id=proposal.id,
                    user_id=commenter,
                    content=fake.sentence(),
                ))

        # Add checklist items (1-4)
        for _ in range(random.randint(1, 4)):
            assigned = random.choice(picked).id if picked else organizer.id
            due_dt = start_time - timedelta(days=random.randint(1, 10))
            db.add(EventChecklistItem(
                event_id=event.id,
                title=fake.sentence(nb_words=3),
                description=fake.sentence(),
                is_completed=random.random() < 0.3,
                assigned_user_id=assigned,
                sort_order=random.randint(0, 10),
                due_datetime=due_dt,
                created_by_user_id=organizer.id,
            ))

        # Add reminders for upcoming events
        if start_time > datetime.now(timezone.utc):
            options = ["one_week", "three_days", "one_day"]
            for opt in random.sample(options, k=random.randint(1, len(options))):
                delta = {"one_week": timedelta(days=7), "three_days": timedelta(days=3), "one_day": timedelta(days=1)}[opt]
                remind_at = start_time - delta
                for uid in [organizer.id] + [u.id for u in random.sample(picked, k=min(2, len(picked)))]:
                    db.add(EventReminder(
                        event_id=event.id,
                        user_id=uid,
                        option=opt,
                        remind_at=remind_at,
                        is_sent=False,
                    ))

    print(f"Successfully seeded {num_events} events with participants, categories, and proposals")
    print(f"Successfully seeded {num_events} events")
