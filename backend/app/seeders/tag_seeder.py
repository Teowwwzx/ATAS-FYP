from sqlalchemy.orm import Session
from app.models.profile_model import Tag
import uuid


def seed_tags(db: Session, tags: list[str] | None = None):
    print("Seeding tags...")
    default_tags = tags or [
        # Core Technologies
        "ai", "machine_learning", "data_science", "blockchain", "cloud", "devops",
        "cybersecurity", "web3", "iot", "quantum_computing",
        
        # Development Areas
        "frontend", "backend", "fullstack", "mobile", "desktop", "embedded",
        "game_development", "ar_vr",
        
        # Specializations
        "robotics", "nlp", "computer_vision", "deep_learning", "distributed_systems",
        "microservices", "api_development", "database_design",
        
        # Industries & Domains
        "fintech", "healthtech", "edtech", "e_commerce", "saas", "enterprise",
        "social_media", "gaming", "streaming", "logistics",
        
        # Interests & Activities
        "education", "career", "startup", "community", "research", "hackathon",
        "open_source", "mentorship", "networking", "innovation",
        
        # Event Types
        "workshop", "seminar", "conference", "webinar", "bootcamp", "panel_discussion",
        
        # Skills & Practices
        "agile", "scrum", "testing", "security", "performance", "scalability",
        "ux_design", "ui_design", "product_management", "technical_writing",
        
        # Emerging Tech
        "metaverse", "nft", "defi", "edge_computing", "5g", "autonomous_vehicles",
        "green_tech", "biotech", "space_tech"
    ]

    created = 0
    for name in default_tags:
        existing = db.query(Tag).filter(Tag.name == name).first()
        if not existing:
            db.add(Tag(id=uuid.uuid4(), name=name))
            created += 1
    print(f"Successfully ensured {len(default_tags)} tags ({created} new)")

