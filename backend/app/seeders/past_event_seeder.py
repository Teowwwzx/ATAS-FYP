from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.models.user_model import User
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType, EventStatus, 
    EventRegistrationStatus, EventVisibility, EventCategory, Category,
    EventParticipant, EventParticipantRole, EventParticipantStatus
)
from app.models.review_model import Review
from app.database.database import SessionLocal
import random
import uuid

def seed_past_events_only(db: Session):
    print("Seeding ONLY past events (No Cleaning)...")

    # 1. Fetch existing users to be organizers and sponsors
    organizer = db.query(User).filter(User.email == "admin@atas.com").first()
    if not organizer:
        organizer = db.query(User).filter(User.email == "sponsor@atas.com").first()
    if not organizer:
        organizer = db.query(User).first()
    
    if not organizer:
        print("Error: No users found in database. Please run main seeder first.")
        return

    print(f"Using organizer: {organizer.email}")

    # Fetch potential reviewers and sponsors (users who are not the organizer)
    users = db.query(User).filter(User.id != organizer.id).limit(20).all()
    if not users:
        print("Warning: No other users found. Using organizer as fallback.")
        users = [organizer]

    # 2. Fetch Categories
    categories = db.query(Category).all()
    
    # Define available images
    available_images = ["/img/1.webp", "/img/2.png"]

    # 3. Create Past Events
    now = datetime.now(timezone.utc)
    
    # Titles and descriptions for random generation
    titles = [
        "Tech Innovation Summit", "Future of AI Conference", "Web Development Bootcamp",
        "Data Science Workshop", "Blockchain Revolution", "Cybersecurity Awareness",
        "Cloud Computing Expo", "UX/UI Design Sprint", "Mobile App Development",
        "Digital Marketing Masterclass", "E-commerce Strategy", "Startup Growth Hacks",
        "Sustainable Tech Forum", "IoT Connectivity", "5G Network Evolution",
        "Game Development Jam", "AR/VR Showcase", "Robotics Challenge",
        "Quantum Computing Talk", "Agile Methodologies"
    ]
    
    venues = [
        "KL Convention Centre", "Zoom", "Common Ground", "Sasana Kijang", "APU Auditorium",
        "Google Meet", "Microsoft Teams", "The Hive", "Innovation Hub", "Tech Park"
    ]

    new_events = []
    
    # Generate 15 past events
    for i in range(15):
        days_ago = random.randint(30, 365)
        start = now - timedelta(days=days_ago)
        end = start + timedelta(hours=random.randint(2, 8))
        
        # Pick random images
        cover = random.choice(available_images)
        logo = random.choice(available_images)
        
        title = random.choice(titles) + f" {2025 if days_ago > 0 else 2024}"
        
        evt = Event(
            organizer_id=organizer.id,
            title=title,
            description=f"An amazing event about {title}. Join us to learn more!",
            start_datetime=start,
            end_datetime=end,
            format=random.choice(list(EventFormat)),
            type=random.choice(list(EventType)),
            status=EventStatus.ended, # Past events are usually ended
            registration_status=EventRegistrationStatus.closed,
            registration_type=random.choice(list(EventRegistrationType)),
            visibility=EventVisibility.public,
            venue_remark=random.choice(venues),
            max_participant=random.randint(50, 500),
            cover_url=cover,
            logo_url=logo,
            price=random.choice([0.0, 10.0, 50.0, 100.0]),
            currency="MYR"
        )
        db.add(evt)
        new_events.append(evt)
    
    db.commit()

    # 4. Assign Categories
    if categories:
        for evt in new_events:
            db.refresh(evt)
            # Assign 1-2 random categories
            cats_to_assign = random.sample(categories, min(len(categories), random.randint(1, 2)))
            for cat in cats_to_assign:
                db.add(EventCategory(event_id=evt.id, category_id=cat.id))
        db.commit()

    # 5. Create Reviews and Sponsors
    print("Seeding reviews and sponsors for past events...")
    
    review_comments = [
        "Great event! Learned a lot.",
        "The venue was amazing.",
        "Speakers were very knowledgeable.",
        "A bit too long, but good content.",
        "Excellent networking opportunity.",
        "Would definitely attend again!",
        "Well organized.",
        "Food could be better, but the talks were top notch.",
        "Inspiring session.",
        "The workshop was very hands-on."
    ]

    sponsor_names = ["TechCorp", "InnovateSolutions", "FutureLabs", "DevStudio", "CloudSystems"]

    for evt in new_events:
        # Create 1-3 reviews per event
        num_reviews = random.randint(1, 3)
        # Pick random reviewers
        evt_reviewers = random.sample(users, min(len(users), num_reviews))
        
        for reviewer in evt_reviewers:
            review = Review(
                event_id=evt.id,
                org_id=evt.organization_id,
                reviewer_id=reviewer.id,
                reviewee_id=None,
                rating=random.randint(3, 5),
                comment=random.choice(review_comments)
            )
            db.add(review)
            
        # Create 1-2 sponsors per event
        num_sponsors = random.randint(1, 2)
        evt_sponsors = random.sample(users, min(len(users), num_sponsors))
        
        for sponsor_user in evt_sponsors:
            # Check if already participant
            existing = db.query(EventParticipant).filter(
                EventParticipant.event_id == evt.id,
                EventParticipant.user_id == sponsor_user.id
            ).first()
            
            if not existing:
                sponsor = EventParticipant(
                    event_id=evt.id,
                    user_id=sponsor_user.id,
                    role=EventParticipantRole.sponsor,
                    status=EventParticipantStatus.accepted,
                    description=f"Proud sponsor of {evt.title}",
                    promo_link="https://example.com",
                    promo_image_url=random.choice(available_images)
                )
                db.add(sponsor)

    db.commit()

    print(f"Successfully seeded {len(new_events)} past events with reviews and sponsors.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_past_events_only(db)
    finally:
        db.close()
