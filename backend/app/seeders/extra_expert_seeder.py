import logging
import uuid
import os
import sys

# Add path to sys to ensure imports work if run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, ProfileVisibility, Tag
from app.models.review_model import Review
from app.core.security import get_password_hash
from app.services.ai_service import upsert_expert_embedding

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_extra_experts():
    """
    Seeds 3 extra experts with tags, embeddings, and reviews.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding extra experts...")

        expert_role = db.query(Role).filter(Role.name == "expert").first()
        student_user = db.query(User).filter(User.email == "student@gmail.com").first() # Reviewer
        
        if not expert_role:
             logger.error("Expert role not found. Run basic seeders first.")
             return

        experts_data = [
            {
                "email": "expert_fintech@gmail.com",
                "name": "Sarah Fintech",
                "title": "Fintech Innovation Lead",
                "bio": "Expert in Blockchain, DeFi, and Financial Technology with 10 years experience.",
                "tags": ["Fintech", "Blockchain", "DeFi"],
                "review": "Sarah provided excellent insights on DeFi protocols."
            },
            {
                "email": "expert_ai@gmail.com",
                "name": "Dr. Alan AI",
                "title": "Chief AI Scientist",
                "bio": "Specializing in NLP, LLMs, and Generative AI applications for business.",
                "tags": ["Artificial Intelligence", "NLP", "Machine Learning"],
                "review": "Alan's workshop on LLMs was mind-blowing!"
            },
            {
                "email": "expert_cyber@gmail.com",
                "name": "Emily Secure",
                "title": "Head of Security",
                "bio": "Expert in penetration testing and network security.",
                "tags": ["Cybersecurity", "Network Security", "Ethical Hacking"],
                "review": "Emily helped us secure our infrastructure."
            }
        ]

        for data in experts_data:
            user = db.query(User).filter(User.email == data["email"]).first()
            if not user:
                user = User(
                    email=data["email"],
                    password=get_password_hash("password123"),
                    is_verified=True,
                    status=UserStatus.active,
                    referral_code=str(uuid.uuid4())[:8]
                )
                user.roles.append(expert_role)
                db.add(user)
                db.flush() # Get ID
                
                # Check/Create Tags
                profile_tags = []
                for tag_name in data["tags"]:
                    tag = db.query(Tag).filter(Tag.name == tag_name).first()
                    if not tag:
                        tag = Tag(name=tag_name)
                        db.add(tag)
                        db.flush()
                    profile_tags.append(tag)
                
                # Create Profile
                profile = Profile(
                    user_id=user.id,
                    full_name=data["name"],
                    title=data["title"],
                    bio=data["bio"],
                    visibility=ProfileVisibility.public,
                    is_onboarded=True
                )
                db.add(profile)
                db.flush()

                # Link Tags
                profile.tags.extend(profile_tags)
                
                # Create Review
                if student_user:
                    review = Review(
                        reviewer_id=student_user.id,
                        reviewee_id=user.id,
                        rating=5,
                        comment=data["review"]
                    )
                    db.add(review)

                db.commit() # Commit to save all relation changes

                # Generate/Upsert Embedding (After commit so relations exist if needed, but we pass source_text manually)
                source_text = f"{data['name']} {data['title']} {data['bio']} {' '.join(data['tags'])}"
                # Use dummy embedding if no key, but service handles it
                # Note: upsert_expert_embedding handles transaction inside it usually, or uses db session passed
                # Let's check logic: it uses db.execute.
                upsert_expert_embedding(db, user.id, source_text)
                
                logger.info(f"Created expert {data['name']} with tags and embedding.")
            else:
                logger.info(f"Expert {data['email']} already exists.")

        logger.info("Extra experts seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding extra experts: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_extra_experts()
