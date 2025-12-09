import random
from datetime import datetime, timedelta, timezone
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.organization_model import Organization
from app.models.profile_model import Education, JobExperience

fake = Faker()

# Sample qualifications
QUALIFICATIONS = [
    "Bachelor of Science",
    "Bachelor of Arts",
    "Bachelor of Engineering",
    "Bachelor of Computer Science",
    "Master of Science",
    "Master of Business Administration",
    "Master of Engineering",
    "Doctor of Philosophy",
    "Associate Degree",
    "Diploma",
]

FIELDS_OF_STUDY = [
    "Computer Science",
    "Software Engineering",
    "Data Science",
    "Information Technology",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Business Administration",
    "Marketing",
    "Finance",
    "Economics",
    "Psychology",
    "Mathematics",
    "Physics",
    "Biology",
    "Design",
    "Communications",
]

JOB_TITLES = [
    "Software Engineer",
    "Senior Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Scientist",
    "Data Analyst",
    "Machine Learning Engineer",
    "DevOps Engineer",
    "Product Manager",
    "Project Manager",
    "UX/UI Designer",
    "Marketing Manager",
    "Business Analyst",
    "Quality Assurance Engineer",
    "System Administrator",
    "Cloud Architect",
    "Security Engineer",
    "Mobile Developer",
    "Technical Lead",
]


def seed_education(db: Session):
    """Seed education records for users"""
    print("Seeding education data...")
    
    users = db.query(User).all()
    organizations = db.query(Organization).all()
    
    if not users:
        print("No users found, please seed users first.")
        return
    
    created = 0
    for user in users:
        # Each user has 0-3 education records
        num_educations = random.randint(0, 3)
        
        for i in range(num_educations):
            # Random dates
            years_ago = random.randint(1, 15)
            start_date = datetime.now(timezone.utc) - timedelta(days=365 * years_ago)
            
            # Some are current (no end date), some are completed
            is_current = random.random() < 0.2
            end_date = None if is_current else start_date + timedelta(days=random.randint(365, 365 * 5))
            
            education = Education(
                user_id=user.id,
                org_id=random.choice(organizations).id if organizations and random.random() > 0.3 else None,
                qualification=random.choice(QUALIFICATIONS),
                field_of_study=random.choice(FIELDS_OF_STUDY),
                start_datetime=start_date,
                end_datetime=end_date,
                resume_url=f"https://example.com/resumes/{fake.uuid4()}.pdf" if random.random() > 0.6 else None,
                remark=fake.sentence() if random.random() > 0.7 else None,
            )
            
            db.add(education)
            created += 1
    
    print(f"Successfully seeded {created} education records")


def seed_job_experience(db: Session):
    """Seed job experience records for users"""
    print("Seeding job experience data...")
    
    users = db.query(User).all()
    organizations = db.query(Organization).all()
    
    if not users:
        print("No users found, please seed users first.")
        return
    
    created = 0
    for user in users:
        # Each user has 0-5 job experiences
        num_experiences = random.randint(0, 5)
        
        for i in range(num_experiences):
            # Random dates
            years_ago = random.randint(0, 12)
            start_date = datetime.now(timezone.utc) - timedelta(days=365 * years_ago)
            
            # Some are current positions (no end date)
            is_current = i == 0 and random.random() < 0.3
            end_date = None if is_current else start_date + timedelta(days=random.randint(180, 365 * 4))
            
            job_experience = JobExperience(
                user_id=user.id,
                org_id=random.choice(organizations).id if organizations and random.random() > 0.4 else None,
                title=random.choice(JOB_TITLES),
                description=fake.paragraph(nb_sentences=3) if random.random() > 0.3 else fake.sentence(),
                start_datetime=start_date,
                end_datetime=end_date,
            )
            
            db.add(job_experience)
            created += 1
    
    print(f"Successfully seeded {created} job experience records")
