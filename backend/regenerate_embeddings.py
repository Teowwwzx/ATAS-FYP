import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add current directory to path to import app modules
sys.path.append(os.getcwd())

from app.database.database import Base, get_db, SessionLocal
from app.models.user_model import User, Role, user_roles
from app.models.profile_model import Profile
from app.services.ai_service import upsert_expert_embedding

def regenerate():
    db = SessionLocal()
    try:
        # Find all users with 'expert' role
        # We can just join User, user_roles, Role
        sql = text("""
            SELECT u.id 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'expert'
        """)
        result = db.execute(sql).fetchall()
        expert_ids = [row[0] for row in result]
        
        print(f"Found {len(expert_ids)} experts.")
        
        for uid in expert_ids:
            profile = db.query(Profile).filter(Profile.user_id == uid).first()
            if not profile:
                print(f"Skipping user {uid}: No profile found.")
                continue
            
            # Construct source text
            src = f"{profile.full_name}\n{profile.bio or ''}\navailability:{profile.availability or ''}"
            print(f"Regenerating embedding for {profile.full_name} ({uid})...")
            
            success = upsert_expert_embedding(db, uid, src)
            if success:
                print("  Success.")
            else:
                print("  Failed.")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    regenerate()
