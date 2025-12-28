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
from app.models.review_model import Review
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
    "https://placehold.co/200x200/4F46E5/fff.png?text=Event+Logo",
    "https://placehold.co/200x200/EF4444/fff.png?text=Tech+Talk",
    "https://placehold.co/200x200/10B981/fff.png?text=Workshop",
    "https://placehold.co/200x200/F59E0B/fff.png?text=Hackathon",
    "https://placehold.co/200x200/8B5CF6/fff.png?text=Seminar",
    "https://placehold.co/200x200/EC4899/fff.png?text=Meetup",
    "https://placehold.co/200x200/06B6D4/fff.png?text=Conference",
    "https://placehold.co/200x200/14B8A6/fff.png?text=Summit",
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

def seed_event_lifecycle(db, num_scenarios=5):
    print(f"Seeding {num_scenarios} lifecycle scenarios...")
    users = db.query(User).all()
    if not users:
        print("No users found. Please seed users first.")
        return
    categories = list(db.query(Category).all())
    for i in range(num_scenarios):
        start_time = datetime.now(timezone.utc) - timedelta(days=random.randint(5, 30))
        end_time = start_time + timedelta(hours=random.randint(1, 4))
        organizer = random.choice(users)
        event = Event(
            id=uuid.uuid4(),
            organizer_id=organizer.id,
            title="Lifecycle Simulation Event",
            description=fake.paragraph(nb_sentences=4),
            format=random.choice(list(EventFormat)),
            type=random.choice(list(EventType)),
            start_datetime=start_time,
            end_datetime=end_time,
            registration_type=random.choice(list(EventRegistrationType)),
            status=EventStatus.ended,
            visibility=random.choice(list(EventVisibility)),
            registration_status=EventRegistrationStatus.closed,
            auto_accept_registration=True,
            max_participant=random.randint(20, 80),
            logo_url=random.choice(EVENT_LOGO_IMAGES),
            cover_url=random.choice(EVENT_COVER_IMAGES),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(event)
        db.flush()
        db.add(EventPicture(event_id=event.id, url=random.choice(EVENT_PICTURE_IMAGES), caption=fake.sentence(nb_words=6), sort_order=0))
        if categories:
            for cat in random.sample(categories, k=min(2, len(categories))):
                db.add(EventCategory(event_id=event.id, category_id=cat.id))
        db.add(EventParticipant(event_id=event.id, user_id=organizer.id, role=EventParticipantRole.organizer, status=EventParticipantStatus.accepted, join_method="seed"))
        pool = [u for u in users if u.id != organizer.id]
        if not pool:
            continue
        speaker = random.choice(pool)
        db.add(EventParticipant(event_id=event.id, user_id=speaker.id, role=EventParticipantRole.speaker, status=EventParticipantStatus.attended, description=fake.sentence(), join_method="invitation"))
        committees = random.sample([u for u in pool if u.id != speaker.id], k=min(2, max(0, len(pool) - 1)))
        for cm in committees:
            db.add(EventParticipant(event_id=event.id, user_id=cm.id, role=EventParticipantRole.committee, status=EventParticipantStatus.attended, join_method="registration"))
        audience_pool = [u for u in pool if u.id not in [speaker.id] + [c.id for c in committees]]
        picked_audience = random.sample(audience_pool, k=min(random.randint(5, 15), len(audience_pool))) if audience_pool else []
        for a in picked_audience:
            st = random.choices([EventParticipantStatus.attended, EventParticipantStatus.absent], weights=[85, 15], k=1)[0]
            db.add(EventParticipant(event_id=event.id, user_id=a.id, role=EventParticipantRole.audience, status=st, join_method="registration"))
        db.flush()
        proposal = EventProposal(event_id=event.id, created_by_user_id=speaker.id, title=fake.sentence(nb_words=4), description=fake.paragraph(nb_sentences=3))
        db.add(proposal)
        db.flush()
        sp = db.query(EventParticipant).filter(EventParticipant.event_id == event.id, EventParticipant.user_id == speaker.id, EventParticipant.role == EventParticipantRole.speaker).first()
        if sp:
            sp.proposal_id = proposal.id
            db.add(sp)
        db.add(EventProposalComment(proposal_id=proposal.id, user_id=organizer.id, content=fake.sentence()))
        assigned_targets = [speaker] + committees
        for idx2 in range(random.randint(2, 5)):
            due_dt = start_time - timedelta(days=random.randint(1, 7))
            assigned_user = random.choice(assigned_targets).id if assigned_targets else organizer.id
            db.add(EventChecklistItem(event_id=event.id, title=fake.sentence(nb_words=3), description=fake.sentence(), is_completed=random.random() < 0.6, assigned_user_id=assigned_user, sort_order=idx2, due_datetime=due_dt, created_by_user_id=organizer.id))
        participants = db.query(EventParticipant).filter(EventParticipant.event_id == event.id).all()
        participant_ids = [p.user_id for p in participants]
        targets = [speaker.id] + [organizer.id]
        for t in targets:
            for r in random.sample(participant_ids, k=min(2, len(participant_ids))):
                if r == t:
                    continue
                rating = random.choices([3, 4, 5], weights=[15, 35, 50], k=1)[0]
                db.add(Review(event_id=event.id, org_id=None, reviewer_id=r, reviewee_id=t, rating=rating, comment=fake.sentence() if random.random() > 0.3 else None))
    print(f"Successfully seeded {num_scenarios} lifecycle scenarios")

def seed_proposal_invitation_for_student1(db):
    """Seed a specific pending invitation with proposal for student1"""
    print("Seeding proposal invitation for student1...")
    
    # 1. Find student1
    student = db.query(User).filter(User.email == "student1@gmail.com").first()
    if not student:
        print("student1@gmail.com not found. Skipping.")
        return

    # 2. Find an organizer (e.g. teacher1)
    organizer = db.query(User).filter(User.email == "teacher1@gmail.com").first()
    if not organizer:
        # Fallback to any user who is not student1
        organizer = db.query(User).filter(User.id != student.id).first()
    
    if not organizer:
        print("No organizer found. Skipping.")
        return

    # 3. Create a future event
    start_time = datetime.now(timezone.utc) + timedelta(days=14)
    end_time = start_time + timedelta(hours=2)
    
    event = Event(
        id=uuid.uuid4(),
        organizer_id=organizer.id,
        title="Keynote: The Future of AI in Education",
        description="An exclusive session discussing how AI is transforming the educational landscape. You have been invited to present your proposal.",
        format=EventFormat.seminar,
        type=EventType.offline,
        start_datetime=start_time,
        end_datetime=end_time,
        registration_type=EventRegistrationType.free,
        status=EventStatus.published,
        visibility=EventVisibility.public,
        registration_status=EventRegistrationStatus.opened,
        auto_accept_registration=True,
        max_participant=200,
        logo_url="https://placehold.co/200x200/0D9488/fff.png?text=AI+Ed",
        cover_url="https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1200&h=600&fit=crop",
        venue_place_id="ChIJr7mC9fN5zDERSrD1wGg7oYQ",
        venue_remark="Grand Hall, Main Campus",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(event)
    db.flush()

    # 4. Create a proposal for student1
    proposal = EventProposal(
        event_id=event.id,
        created_by_user_id=student.id,
        title="AI-Driven Personalized Learning Paths",
        description="This proposal outlines a framework for using machine learning to adapt curriculum to individual student needs in real-time.",
        file_url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    )
    db.add(proposal)
    db.flush()

    # 5. Create invitation (EventParticipant) linked to the proposal
    invitation = EventParticipant(
        event_id=event.id,
        user_id=student.id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.pending,
        join_method="invitation",
        proposal_id=proposal.id
    )
    db.add(invitation)
    
    # Add organizer as accepted participant
    db.add(EventParticipant(
        event_id=event.id,
        user_id=organizer.id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted,
        join_method="seed"
    ))

    print("Successfully seeded proposal invitation for student1")
