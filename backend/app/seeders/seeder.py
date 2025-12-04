from sqlalchemy import text
from app.database.database import engine, SessionLocal, Base
from app.models import __all__ as all_models

# Import all models to ensure they are registered with the Base metadata
from app.models.audit_log_model import AuditLog
from app.models.event_model import Event
from app.models.follows_model import Follow
from app.models.notification_model import Notification
from app.models.organization_model import Organization
from app.models.profile_model import Profile
from app.models.review_model import Review
from app.models.skill_model import Skill
from app.models.user_model import User
from app.seeders.user_seeder import seed_users
from app.seeders.event_seeder import seed_events
from app.seeders.skill_seeder import seed_skills
from app.seeders.profile_seeder import seed_profiles
from app.seeders.tag_seeder import seed_tags
from app.seeders.organization_seeder import seed_organizations
from app.seeders.notification_seeder import seed_notifications
from app.seeders.follows_seeder import seed_follows
from app.seeders.audit_log_seeder import seed_audit_logs

def clear_db():
    print("Clearing database...")
    db = SessionLocal()
    try:
        table_names = [table.name for table in reversed(Base.metadata.sorted_tables)]
        if table_names:
            # Using TRUNCATE...RESTART IDENTITY CASCADE to clear all tables,
            # reset primary key sequences, and handle foreign key dependencies.
            db.execute(text(f'TRUNCATE {", ".join(table_names)} RESTART IDENTITY CASCADE;'))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error clearing database: {e}")
        raise
    finally:
        db.close()

def create_tables():
    print("Creating tables if they don't exist...")
    # Create a new session
    db = SessionLocal()
    
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def run_seeders():
    print("Running seeders...")
    db = SessionLocal()
    try:
        # Seed data
        seed_users(db, num_students=10, num_experts=2, num_teachers=1, num_sponsors=1, num_admins=1)
        db.commit()
        seed_skills(db)
        db.commit()
        seed_tags(db)
        db.commit()
        seed_profiles(db)
        db.commit()
        seed_organizations(db, 10)
        db.commit()
        seed_events(db, 20)
        db.commit()
        seed_notifications(db, 100)
        db.commit()
        seed_follows(db, 100)
        db.commit()
        seed_audit_logs(db, 200)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    run_seeders()
    print("Seeding completed successfully!")
