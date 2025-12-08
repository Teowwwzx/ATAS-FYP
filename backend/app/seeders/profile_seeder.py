import random
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.skill_model import Skill
from app.models.profile_model import Profile, profile_skills, Tag, profile_tags, ProfileVisibility

fake = Faker()

# Real avatar images from online sources
AVATAR_IMAGES = [
    "https://i.pravatar.cc/300?img=1",
    "https://i.pravatar.cc/300?img=2",
    "https://i.pravatar.cc/300?img=3",
    "https://i.pravatar.cc/300?img=4",
    "https://i.pravatar.cc/300?img=5",
    "https://i.pravatar.cc/300?img=6",
    "https://i.pravatar.cc/300?img=7",
    "https://i.pravatar.cc/300?img=8",
    "https://i.pravatar.cc/300?img=9",
    "https://i.pravatar.cc/300?img=10",
    "https://i.pravatar.cc/300?img=11",
    "https://i.pravatar.cc/300?img=12",
    "https://i.pravatar.cc/300?img=13",
    "https://i.pravatar.cc/300?img=14",
    "https://i.pravatar.cc/300?img=15",
    "https://i.pravatar.cc/300?img=16",
    "https://i.pravatar.cc/300?img=17",
    "https://i.pravatar.cc/300?img=18",
    "https://i.pravatar.cc/300?img=19",
    "https://i.pravatar.cc/300?img=20",
]

# Real cover images from online sources
COVER_IMAGES = [
    "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1557682260-96773eb01377?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1579547945413-497e1b99dac0?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1579567761406-4684ee0c75b6?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1614850523060-8da1d56ae167?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1614851099175-e5b30eb6f696?w=1200&h=400&fit=crop",
]

def seed_profiles(db: Session):
    """Seed profiles table with fake data"""
    print(f"Seeding profiles...")
    
    users = db.query(User).all()
    skills = db.query(Skill).all()
    tags = db.query(Tag).all()
    
    if not users:
        print("No users found, please seed users first.")
        return
        
    if not skills:
        print("No skills found, please seed skills first.")
        return
    if not tags:
        print("No tags found, please seed tags first.")
        return

    for idx, user in enumerate(users):
        # Check if user already has a profile
        existing_profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if existing_profile:
            print(f"User {user.id} already has a profile, skipping...")
            continue
        
        # More realistic social media URLs
        name_parts = fake.name().lower().replace(" ", "")
        username = f"{name_parts}{random.randint(1, 999)}"
        
        profile = Profile(
            user_id=user.id,
            full_name=fake.name(),
            bio=fake.text(max_nb_chars=200),
            avatar_url=AVATAR_IMAGES[idx % len(AVATAR_IMAGES)],
            cover_url=COVER_IMAGES[idx % len(COVER_IMAGES)],
            linkedin_url=f"https://www.linkedin.com/in/{username}/" if random.random() > 0.3 else None,
            github_url=f"https://github.com/{username}/" if random.random() > 0.3 else None,
            instagram_url=f"https://www.instagram.com/{username}/" if random.random() > 0.3 else None,
            twitter_url=f"https://twitter.com/{username}/" if random.random() > 0.3 else None,
            website_url=fake.url() if random.random() > 0.5 else None,
            visibility=random.choice(list(ProfileVisibility)),
        )
        
        db.add(profile)
        db.flush()

        # Add random skills to the profile
        num_skills_to_add = random.randint(2, 6)
        skills_to_add = random.sample(skills, min(num_skills_to_add, len(skills)))
        skills_to_add = list(set(skills_to_add))
        
        for skill in skills_to_add:
            profile_skill = profile_skills.insert().values(
                profile_id=profile.id,
                skill_id=skill.id,
                level=random.randint(1, 5)
            )
            db.execute(profile_skill)
        
        # Add random tags to the profile
        num_tags_to_add = random.randint(2, 5)
        tags_to_add = list(set(random.sample(tags, min(num_tags_to_add, len(tags)))))
        for tag in tags_to_add:
            profile_tag = profile_tags.insert().values(
                profile_id=profile.id,
                tag_id=tag.id,
            )
            db.execute(profile_tag)
            
    print(f"Successfully seeded profiles.")
