from sqlalchemy.orm import Session
from app.models.profile_model import Tag
import uuid


def seed_tags(db: Session, tags: list[str] | None = None):
    print("Seeding tags...")
    default_tags = tags or [
        "ai",
        "machine_learning",
        "data_science",
        "blockchain",
        "cloud",
        "devops",
        "cybersecurity",
        "frontend",
        "backend",
        "fullstack",
        "mobile",
        "robotics",
        "nlp",
        "computer_vision",
        "education",
        "career",
        "startup",
        "community",
        "research",
        "hackathon",
    ]

    created = 0
    for name in default_tags:
        existing = db.query(Tag).filter(Tag.name == name).first()
        if not existing:
            db.add(Tag(id=uuid.uuid4(), name=name))
            created += 1
    print(f"Successfully ensured {len(default_tags)} tags ({created} new)")

