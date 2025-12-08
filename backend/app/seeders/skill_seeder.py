import uuid
from app.models.skill_model import Skill
from sqlalchemy.orm import Session

def seed_skills(db: Session):
    """Seed skills table with comprehensive skills data"""
    print(f"Seeding skills...")
    
    # Comprehensive list of skills organized by category
    skills = [
        # Programming Languages
        "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
        
        # Web Development
        "React", "Vue.js", "Angular", "Next.js", "Node.js", "Express.js", "Django", "Flask", "FastAPI", "Laravel",
        "HTML", "CSS", "Tailwind CSS", "Bootstrap", "SASS", "jQuery",
        
        # Mobile Development
        "React Native", "Flutter", "iOS Development", "Android Development", "Xamarin",
        
        # Database & Data
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "GraphQL", "Firebase",
        "Data Analysis", "Data Science", "Machine Learning", "Deep Learning", "AI", "TensorFlow", "PyTorch",
        "Pandas", "NumPy", "Scikit-learn",
        
        # DevOps & Cloud
        "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "CI/CD", "Jenkins", "GitHub Actions",
        "Terraform", "Ansible", "Linux", "Nginx", "Apache",
        
        # Tools & Practices
        "Git", "GitHub", "GitLab", "Jira", "Agile", "Scrum", "Kanban", "Project Management",
        "REST API", "Microservices", "Testing", "Unit Testing", "Integration Testing",
        
        # Design & UI/UX
        "Figma", "Adobe XD", "Photoshop", "Illustrator", "UI/UX Design", "Responsive Design",
        "User Research", "Wireframing", "Prototyping",
        
        # Security & Blockchain
        "Cybersecurity", "Blockchain", "Ethereum", "Smart Contracts", "Solidity", "Web3",
        "Penetration Testing", "Network Security",
        
        # Soft Skills
        "Leadership", "Teamwork", "Communication", "Public Speaking", "Critical Thinking",
        "Problem Solving", "Time Management", "Creativity", "Adaptability", "Mentoring",
        "Presentation Skills", "Negotiation", "Conflict Resolution",
        
        # Specialized
        "Computer Vision", "Natural Language Processing", "Robotics", "IoT", "AR/VR",
        "Game Development", "Unity", "Unreal Engine", "3D Modeling", "Animation"
    ]
    
    created = 0
    for skill_name in skills:
        skill = db.query(Skill).filter(Skill.name == skill_name).first()
        if not skill:
            skill = Skill(id=uuid.uuid4(), name=skill_name)
            db.add(skill)
            created += 1
            
    print(f"Successfully seeded {len(skills)} skills ({created} new)")