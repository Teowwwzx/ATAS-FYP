import random
from datetime import datetime, timedelta, timezone
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.onboarding_model import UserOnboarding, OnboardingStatus

fake = Faker()


def seed_onboarding(db: Session):
    """Seed user onboarding records with different completion states"""
    print("Seeding user onboarding data...")
    
    users = db.query(User).all()
    if not users:
        print("No users found, please seed users first.")
        return
    
    created = 0
    for idx, user in enumerate(users):
        # Check if onboarding already exists
        existing = db.query(UserOnboarding).filter(UserOnboarding.user_id == user.id).first()
        if existing:
            continue
        
        # Create different onboarding states for variety
        # 60% completed, 20% in progress, 10% not started, 10% skipped
        rand = random.random()
        
        if rand < 0.6:  # 60% completed
            status = OnboardingStatus.completed
            current_step = 5
            profile_completed = True
            skills_added = True
            interests_selected = True
            experience_added = True
            preferences_set = True
            started_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
            completed_at = started_at + timedelta(minutes=random.randint(5, 30))
            skipped_at = None
            
        elif rand < 0.8:  # 20% in progress
            status = OnboardingStatus.in_progress
            current_step = random.randint(1, 4)
            profile_completed = current_step >= 1
            skills_added = current_step >= 2
            interests_selected = current_step >= 3
            experience_added = current_step >= 4
            preferences_set = False
            started_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7))
            completed_at = None
            skipped_at = None
            
        elif rand < 0.9:  # 10% not started
            status = OnboardingStatus.not_started
            current_step = 0
            profile_completed = False
            skills_added = False
            interests_selected = False
            experience_added = False
            preferences_set = False
            started_at = None
            completed_at = None
            skipped_at = None
            
        else:  # 10% skipped
            status = OnboardingStatus.skipped
            current_step = random.randint(0, 3)
            profile_completed = current_step >= 1
            skills_added = current_step >= 2
            interests_selected = False
            experience_added = False
            preferences_set = False
            started_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15))
            completed_at = None
            skipped_at = started_at + timedelta(minutes=random.randint(1, 10))
        
        # Random onboarding data
        onboarding_data = {
            "career_goals": random.choice([
                "Find job opportunities",
                "Network with professionals",
                "Learn new skills",
                "Share knowledge",
                "Build my portfolio"
            ]) if status != OnboardingStatus.not_started else None,
            "notification_preferences": {
                "email_events": random.choice([True, False]),
                "email_messages": random.choice([True, False]),
                "email_digest": random.choice([True, False]),
            } if preferences_set else None,
            "referral_source": random.choice([
                "Google Search",
                "Social Media",
                "Friend Referral",
                "University",
                "Job Board"
            ]) if status != OnboardingStatus.not_started else None,
        }
        
        onboarding = UserOnboarding(
            user_id=user.id,
            status=status,
            current_step=current_step,
            total_steps=5,
            profile_completed=profile_completed,
            skills_added=skills_added,
            interests_selected=interests_selected,
            experience_added=experience_added,
            preferences_set=preferences_set,
            onboarding_data=onboarding_data,
            started_at=started_at,
            completed_at=completed_at,
            skipped_at=skipped_at,
        )
        
        db.add(onboarding)
        created += 1
    
    print(f"Successfully seeded {created} onboarding records")
