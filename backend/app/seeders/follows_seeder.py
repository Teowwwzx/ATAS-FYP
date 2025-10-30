import random
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.follows_model import Follow

def seed_follows(db: Session, num_follows: int):
    """Seed follows table with fake data"""
    print(f"Seeding {num_follows} follows...")
    
    users = db.query(User).all()
    if not users:
        print("No users found, please seed users first.")
        return

    for _ in range(num_follows):
        follower = random.choice(users)
        followee = random.choice(users)
        
        # Ensure follower and followee are not the same
        while follower.id == followee.id:
            followee = random.choice(users)
            
        # Check if the follow relationship already exists
        existing_follow = db.query(Follow).filter(
            Follow.follower_id == follower.id,
            Follow.followee_id == followee.id
        ).first()
        
        if not existing_follow:
            follow = Follow(
                follower_id=follower.id,
                followee_id=followee.id
            )
            db.add(follow)

    db.commit()
    print(f"Successfully seeded {num_follows} follows.")