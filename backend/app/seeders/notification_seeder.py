import random
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.notification_model import Notification, NotificationType

fake = Faker()

def seed_notifications(db: Session, num_notifications: int):
    """Seed notifications table with fake data"""
    print(f"Seeding {num_notifications} notifications...")
    
    users = db.query(User).all()
    if not users:
        print("No users found, please seed users first.")
        return

    for _ in range(num_notifications):
        recipient = random.choice(users)
        actor = random.choice(users)
        
        # Ensure recipient and actor are not the same
        while recipient.id == actor.id:
            actor = random.choice(users)
            
        notification = Notification(
            recipient_id=recipient.id,
            actor_id=actor.id,
            type=random.choice(list(NotificationType)),
            content=fake.sentence(),
            link_url=fake.url(),
            is_read=fake.boolean()
        )
        db.add(notification)

    db.commit()
    print(f"Successfully seeded {num_notifications} notifications.")