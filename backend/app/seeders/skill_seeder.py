import uuid
from app.models.skill_model import Skill
from sqlalchemy.orm import Session

def seed_skills(db: Session, num_skills=20):
    """Seed skills table with fake data"""
    print(f"Seeding {num_skills} skills...")
    
    skills = [
        "Python", "JavaScript", "React", "Node.js", "SQL", "FastAPI", "Docker",
        "Git", "Project Management", "Agile", "Scrum", "CI/CD", "Public Speaking",
        "Leadership", "Teamwork", "Communication", "Problem Solving", "Critical Thinking",
        "Data Analysis", "Machine Learning"
    ]
    
    for skill_name in skills:
        skill = db.query(Skill).filter(Skill.name == skill_name).first()
        if not skill:
            skill = Skill(id=uuid.uuid4(), name=skill_name)
            db.add(skill)
            
    print(f"Successfully seeded {len(skills)} skills")