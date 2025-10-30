from app.models.event_model import Event, EventFormat, EventType, EventRegistrationType, EventStatus, EventVisibility
from app.models.user_model import User
from faker import Faker
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy.sql import func

fake = Faker()

def seed_events(db, num_events=20):
    """Seed events table with fake data"""
    print(f"Seeding {num_events} events...")
    
    # Get all users to assign as organizers
    users = db.query(User.id).all()
    
    if not users:
        print("No users found. Please seed users first.")
        return
    
    for _ in range(num_events):
        # Random start time between now and 30 days in the future
        start_time = datetime.now() + timedelta(days=random.randint(1, 30))
        # Event duration between 1 and 4 hours
        end_time = start_time + timedelta(hours=random.randint(1, 4))
        
        organizer = random.choice(users)
        
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
            status=random.choice(list(EventStatus)),
            visibility=random.choice(list(EventVisibility)),
            max_participant=random.randint(10, 100) if random.random() > 0.3 else None,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(event)
    
    db.flush()  # Flush to get the IDs without committing
    print(f"Successfully seeded {num_events} events")