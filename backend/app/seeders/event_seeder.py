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
    EventPicture,
)
from app.models.user_model import User
from faker import Faker
import uuid
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.sql import func

fake = Faker()

# Real event cover images
EVENT_COVER_IMAGES = [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1559223607-96aa90755327?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1561489396-888724a1543d?w=1200&h=600&fit=crop",
]

# Real event logo images
EVENT_LOGO_IMAGES = [
    "https://ui-avatars.com/api/?name=Event+Logo&background=4F46E5&color=fff&size=200&bold=true",
    "https://ui-avatars.com/api/?name=Tech+Talk&background=EF4444&color=fff&size=200&bold=true",
    "https://ui-avatars.com/api/?name=Workshop&background=10B981&color=fff&size=200&bold=true",
    "https://ui-avatars.com/api/?name=Hackathon&background=F59E0B&color=fff&size=200&bold=true",
    "https://ui-avatars.com/api/?name=Seminar&background=8B5CF6&color=fff&size=200&bold=true",
    "https://ui-avatars.com/api/?name=Meetup&background=EC4899&color=fff&size=200&bold=true",
    "https://ui-avatars.com/api/?name=Conference&background=06B6D4&color=fff&size=200&bold=true",
    "https://ui-avatars.com/api/?name=Summit&background=14B8A6&color=fff&size=200&bold=true",
]

# Real event picture images
EVENT_PICTURE_IMAGES = [
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
]

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
    
    for idx in range(num_events):
        # Bias towards future dates to yield more 'published' events
        if random.random() < 0.7:
            offset_days = random.randint(0, 30)
        else:
            offset_days = random.randint(-15, -1)
        start_time = datetime.now(timezone.utc) + timedelta(days=offset_days)
        # Event duration between 1 and 4 hours
        end_time = start_time + timedelta(hours=random.randint(1, 4))
        
        organizer = random.choice(users)
        
        # Lifecycle and registration defaults
        status_choice = EventStatus.published if start_time > datetime.now(timezone.utc) else EventStatus.ended
        # Smaller portion remain as drafts
        if random.random() < 0.05:
            status_choice = EventStatus.draft

        # More realistic event titles based on format
        event_formats_titles = {
            EventFormat.panel_discussion: [
                "Industry Leaders Panel on AI Innovation",
                "Future of Tech: Expert Panel Discussion",
                "Career in Software Engineering Panel"
            ],
            EventFormat.workshop: [
                "Hands-on Machine Learning Workshop",
                "Full-Stack Development Bootcamp",
                "UI/UX Design Workshop"
            ],
            EventFormat.webinar: [
                "Introduction to Cloud Computing",
                "Data Science Fundamentals",
                "Cybersecurity Best Practices"
            ],
            EventFormat.seminar: [
                "Research Presentation: Quantum Computing",
                "Academic Seminar on Blockchain Technology",
                "Graduate School Information Session"
            ],
        }
        
        event_format = random.choice(list(EventFormat))
        event_title = random.choice(event_formats_titles.get(event_format, ["Tech Event", "Community Meetup", "Networking Event"]))
        event_type = random.choice(list(EventType))

        event = Event(
            id=uuid.uuid4(),
            organizer_id=organizer.id,
            title=event_title,
            description=fake.paragraph(nb_sentences=5),
            format=event_format,
            type=event_type,
            start_datetime=start_time,
            end_datetime=end_time,
            # Bias towards free registration
            registration_type=random.choices(
                population=[EventRegistrationType.free, EventRegistrationType.paid],
                weights=[85, 15],
                k=1,
            )[0],
            status=status_choice,
            visibility=random.choice(list(EventVisibility)),
            registration_status=EventRegistrationStatus.opened,
            auto_accept_registration=True,
            max_participant=random.randint(10, 100) if random.random() > 0.3 else None,
            logo_url=EVENT_LOGO_IMAGES[idx % len(EVENT_LOGO_IMAGES)],
            cover_url=EVENT_COVER_IMAGES[idx % len(EVENT_COVER_IMAGES)],
            venue_place_id="ChIJr7mC9fN5zDERSrD1wGg7oYQ" if event_type != EventType.online else None,
            venue_remark=fake.sentence() if random.random() > 0.5 else None,
            remark=fake.sentence() if random.random() > 0.7 else None,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(event)
        db.flush()

        # Add event pictures (1-3 pictures per event)
        num_pictures = random.randint(1, 3)
        for pic_idx in range(num_pictures):
            event_picture = EventPicture(
                event_id=event.id,
                url=EVENT_PICTURE_IMAGES[pic_idx % len(EVENT_PICTURE_IMAGES)],
                caption=fake.sentence(nb_words=6),
                sort_order=pic_idx,
            )
            db.add(event_picture)

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

        # Add participants with diverse statuses
        others = [u for u in users if u.id != organizer.id]
        num_participants = random.randint(3, 15)
        picked = random.sample(others, k=min(num_participants, len(others)))
        for item in picked:
            role = random.choices(
                population=[EventParticipantRole.audience, EventParticipantRole.committee, EventParticipantRole.speaker, EventParticipantRole.sponsor],
                weights=[65, 20, 10, 5],
                k=1,
            )[0]
            
            # Status depends on event timing
            if event.status == EventStatus.ended:
                # For ended events: mostly attended, some absent, few accepted/rejected
                status = random.choices(
                    population=[
                        EventParticipantStatus.attended,
                        EventParticipantStatus.absent,
                        EventParticipantStatus.accepted,
                        EventParticipantStatus.rejected
                    ],
                    weights=[60, 20, 15, 5],
                    k=1,
                )[0]
            elif event.status == EventStatus.draft:
                # For draft events: mostly pending
                status = random.choices(
                    population=[EventParticipantStatus.pending, EventParticipantStatus.rejected],
                    weights=[90, 10],
                    k=1,
                )[0]
            else:
                # For upcoming/published events: mix of pending, accepted, rejected
                status = random.choices(
                    population=[
                        EventParticipantStatus.accepted,
                        EventParticipantStatus.pending,
                        EventParticipantStatus.rejected
                    ],
                    weights=[60, 30, 10],
                    k=1,
                )[0]
            
            # Add description for speakers and sponsors
            description = None
            if role == EventParticipantRole.speaker:
                description = f"Speaking on: {fake.catch_phrase()}"
            elif role == EventParticipantRole.sponsor:
                description = f"Sponsor tier: {random.choice(['Gold', 'Silver', 'Bronze'])}"
            
            db.add(EventParticipant(
                event_id=event.id,
                user_id=item.id,
                role=role,
                status=status,
                description=description,
                join_method=random.choice(["invitation", "registration", "seed"]),
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
