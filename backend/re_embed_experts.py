from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database.database import Base, get_db, SessionLocal
from app.services.ai_service import upsert_expert_embedding
import uuid

def re_embed():
    db = SessionLocal()
    try:
        # Get all profiles with role expert
        # For simplicity, we just look at the profiles table and assume we want to embed all of them or just the one we care about.
        # But `upsert_expert_embedding` takes `source_text`. We need to reconstruct it.
        
        # Query profiles joined with role check? Or just all profiles for now?
        # Let's just do it for the specific user we are testing: ea7c734d-57a4-4acb-8803-e127ea207527
        
        uid = "ea7c734d-57a4-4acb-8803-e127ea207527"
        sql = text("SELECT full_name, bio, availability FROM profiles WHERE user_id = :uid")
        row = db.execute(sql, {"uid": uid}).fetchone()
        
        if row:
            full_name, bio, availability = row
            source_text = f"{full_name}\n{bio or ''}\navailability:{availability or ''}"
            print(f"Re-embedding user {uid}...")
            print(f"Source: {source_text}")
            
            success = upsert_expert_embedding(db, uuid.UUID(uid), source_text)
            if success:
                print("Success!")
                db.commit()
            else:
                print("Failed.")
        else:
            print("User not found in profiles.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    re_embed()