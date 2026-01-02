import sys
import os
import random
from datetime import datetime, timedelta
import uuid

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.user_model import User, UserStatus
from app.models.profile_model import Profile
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType, 
    EventStatus, EventVisibility, EventParticipant, 
    EventParticipantRole, EventParticipantStatus, Category, EventCategory
)
from app.models.follows_model import Follow
from app.core.security import get_password_hash

def seed_discover_data():
    db = SessionLocal()
    try:
        print("Seeding Discover Data...")

        # 1. Create Categories
        categories = [
            "Technology", "Health & Wellness", "Business & Finance", 
            "Arts & Culture", "Social & Networking", "Education", "Sports"
        ]
        
        cat_objs = {}
        for cat_name in categories:
            cat = db.query(Category).filter(Category.name == cat_name).first()
            if not cat:
                cat = Category(name=cat_name)
                db.add(cat)
                db.commit()
                db.refresh(cat)
            cat_objs[cat_name] = cat
        
        print(f"Ensured {len(cat_objs)} categories.")

        # 2. Create Organizers (Friends)
        organizers = [
            {"email": "alice.tech@example.com", "name": "Alice Chen", "bio": "Tech Enthusiast"},
            {"email": "bob.health@example.com", "name": "Bob Smith", "bio": "Yoga Instructor"},
            {"email": "charlie.biz@example.com", "name": "Charlie Davis", "bio": "Entrepreneur"},
            {"email": "diana.art@example.com", "name": "Diana Prince", "bio": "Art Curator"},
        ]
        
        org_users = []
        for org in organizers:
            user = db.query(User).filter(User.email == org["email"]).first()
            if not user:
                user = User(
                    email=org["email"],
                    password=get_password_hash("password123"), # User model has password field, storing hash
                    status=UserStatus.active,
                    referral_code=str(uuid.uuid4())[:8],
                    is_verified=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                profile = Profile(
                    user_id=user.id,
                    full_name=org["name"],
                    bio=org["bio"],
                    is_onboarded=True
                )
                db.add(profile)
                db.commit()
            org_users.append(user)
            
        print(f"Ensured {len(org_users)} organizers.")

        # 3. Create Events
        now = datetime.utcnow()
        
        events_data = [
            {
                "title": "Future of AI Panel",
                "organizer": org_users[0], # Alice
                "category": "Technology",
                "format": EventFormat.panel_discussion,
                "type": EventType.hybrid,
                "reg_type": EventRegistrationType.free,
                "start": now + timedelta(days=5, hours=2),
                "end": now + timedelta(days=5, hours=4), # 2 hours
                "status": EventStatus.published,
                "price": 0.0
            },
            {
                "title": "Morning Yoga Workshop",
                "organizer": org_users[1], # Bob
                "category": "Health & Wellness",
                "format": EventFormat.workshop,
                "type": EventType.physical,
                "reg_type": EventRegistrationType.paid,
                "start": now + timedelta(days=2, hours=1),
                "end": now + timedelta(days=2, hours=2, minutes=30), # 1.5 hours
                "status": EventStatus.published,
                "price": 25.0
            },
            {
                "title": "Startup Funding Secrets",
                "organizer": org_users[2], # Charlie
                "category": "Business & Finance",
                "format": EventFormat.seminar,
                "type": EventType.online,
                "reg_type": EventRegistrationType.free,
                "start": now + timedelta(days=10),
                "end": now + timedelta(days=10, hours=1),
                "status": EventStatus.published,
                "price": 0.0
            },
             {
                "title": "Modern Art Gallery Opening",
                "organizer": org_users[3], # Diana
                "category": "Arts & Culture",
                "format": EventFormat.club_event,
                "type": EventType.physical,
                "reg_type": EventRegistrationType.paid,
                "start": now + timedelta(days=7, hours=10),
                "end": now + timedelta(days=7, hours=14),
                "status": EventStatus.published,
                "price": 50.0
            },
            # Past Event with Sponsorship
            {
                "title": "Tech Summit 2023",
                "organizer": org_users[0], # Alice
                "category": "Technology",
                "format": EventFormat.panel_discussion,
                "type": EventType.physical,
                "reg_type": EventRegistrationType.free,
                "start": now - timedelta(days=100),
                "end": now - timedelta(days=100, hours=5),
                "status": EventStatus.completed,
                "price": 0.0,
                "sponsors": True
            }
        ]
        
        for evt_data in events_data:
            existing = db.query(Event).filter(Event.title == evt_data["title"]).first()
            if not existing:
                event = Event(
                    organizer_id=evt_data["organizer"].id,
                    title=evt_data["title"],
                    description=f"Join us for {evt_data['title']}. It will be an amazing experience!",
                    format=evt_data["format"],
                    type=evt_data["type"],
                    registration_type=evt_data["reg_type"],
                    start_datetime=evt_data["start"],
                    end_datetime=evt_data["end"],
                    status=evt_data["status"],
                    visibility=EventVisibility.public,
                    price=evt_data["price"],
                    currency="MYR",
                    cover_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80" # Placeholder
                )
                db.add(event)
                db.commit()
                db.refresh(event)
                
                # Attach Category
                cat = cat_objs.get(evt_data["category"])
                if cat:
                    ev_cat = EventCategory(event_id=event.id, category_id=cat.id)
                    db.add(ev_cat)
                
                # Add Sponsors if needed
                if evt_data.get("sponsors"):
                    # Add Bob as a sponsor
                    sponsor = EventParticipant(
                        event_id=event.id,
                        user_id=org_users[1].id, # Bob
                        role=EventParticipantRole.sponsor,
                        status=EventParticipantStatus.accepted,
                        name="Bob's Wellness Co.",
                        description="Providing healthy snacks",
                        promo_link="https://bobs-wellness.com",
                        promo_image_url="https://via.placeholder.com/150"
                    )
                    db.add(sponsor)
                
                db.commit()
                print(f"Created event: {evt_data['title']}")

        # 4. Make "Friend" connections
        # We need a way for the logged-in user to see these.
        # Since we don't know the logged-in user, we can't easily add follows for them.
        # BUT, we can make these organizers follow EACH OTHER, so if we login as one of them, we see others.
        # Let's make everyone follow Alice (Tech).
        # And Alice follow Bob.
        
        # Bob follows Alice
        if not db.query(Follow).filter(Follow.follower_id == org_users[1].id, Follow.followee_id == org_users[0].id).first():
            db.add(Follow(follower_id=org_users[1].id, followee_id=org_users[0].id))
        
        # Charlie follows Alice
        if not db.query(Follow).filter(Follow.follower_id == org_users[2].id, Follow.followee_id == org_users[0].id).first():
            db.add(Follow(follower_id=org_users[2].id, followee_id=org_users[0].id))
            
        # Alice follows Bob
        if not db.query(Follow).filter(Follow.follower_id == org_users[0].id, Follow.followee_id == org_users[1].id).first():
            db.add(Follow(follower_id=org_users[0].id, followee_id=org_users[1].id))

        db.commit()
        print("Data seeding completed.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_discover_data()
