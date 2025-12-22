import sys
import os
# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.models.profile_model import Profile
from app.models.ai_model import ExpertEmbedding
from app.routers.profile_router import semantic_search_profiles
from app.services.ai_service import upsert_expert_embedding
from sqlalchemy import text

def test_search():
    db = SessionLocal()
    try:
        print("\nChecking for expert with 'Weekdays after 7pm'...")
        # Check if profile exists
        search_text = "%Weekdays after 7pm%"
        profile = db.query(Profile).filter(
            (Profile.availability.ilike(search_text)) | 
            (Profile.bio.ilike(search_text))
        ).first()
        
        if not profile:
            print("❌ Profile NOT found in DB!")
            return

        print(f"✅ Found Profile: {profile.full_name} (ID: {profile.user_id})")
        print(f"   Availability: {profile.availability}")
        
        # Check embedding
        embedding = db.query(ExpertEmbedding).filter(ExpertEmbedding.user_id == profile.user_id).first()
        if embedding:
            print("✅ Embedding exists in DB.")
        else:
            print("❌ Embedding MISSING in DB. Attempting to generate...")
            try:
                # Force generation
                source_text = f"{profile.full_name}. {profile.headline or ''}. {profile.bio or ''}. Skills: {profile.skills or ''}. Availability: {profile.availability or ''}"
                upsert_expert_embedding(db, profile.user_id, source_text)
                print("✅ Embedding generated and saved.")
            except Exception as e:
                print(f"❌ Failed to generate embedding: {e}")

        # Now search
        print("\nRunning semantic search...")
        results = semantic_search_profiles(
            q_text="Weekdays after 7pm",
            db=db,
            top_k=5
        )
        
        print(f"Found {len(results)} matching experts.")
        for p in results:
            print(f"- {p.full_name}: {p.headline}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_search()
