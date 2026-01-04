import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import SessionLocal, engine, Base
from app.models.chat_model import Conversation # Import to register table
from app.seeders.event_seeder import seed_proposal_invitation_for_student1

def main():
    db = SessionLocal()
    try:
        seed_proposal_invitation_for_student1(db)
        db.commit()
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
