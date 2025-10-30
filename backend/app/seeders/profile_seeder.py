import random
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.skill_model import Skill
from app.models.profile_model import Profile, profile_skills

fake = Faker()

def seed_profiles(db: Session):
    """Seed profiles table with fake data"""
    print(f"Seeding profiles...")
    
    users = db.query(User).all()
    skills = db.query(Skill).all()
    
    if not users:
        print("No users found, please seed users first.")
        return
        
    if not skills:
        print("No skills found, please seed skills first.")
        return

    for user in users:
        # Check if user already has a profile
        existing_profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if existing_profile:
            print(f"User {user.id} already has a profile, skipping...")
            continue
        
        profile = Profile(
            user_id=user.id,
            full_name=fake.name(),
            bio=fake.text(max_nb_chars=200),
            avatar_url=fake.image_url(),
            linkedin_url=f"https://www.linkedin.com/in/{fake.user_name()}/",
            github_url=f"https://github.com/{fake.user_name()}/",
            website_url=fake.url(),
        )
        
        db.add(profile)
        db.flush()

        # Add random skills to the profile
        num_skills_to_add = random.randint(1, 5)
        skills_to_add = random.sample(skills, num_skills_to_add)
        skills_to_add = list(set(skills_to_add))
        
        for skill in skills_to_add:
            profile_skill = profile_skills.insert().values(
                profile_id=profile.id,
                skill_id=skill.id,
                level=random.randint(1, 5)
            )
            db.execute(profile_skill)
            
    print(f"Successfully seeded profiles.")