import requests
import json
import sys
import os
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ai_service import generate_text_embedding
from app.database.database import SessionLocal

def verify_search():
    print("Checking DB count...")
    db = SessionLocal()
    try:
        count = db.execute(text("SELECT count(*) FROM expert_embeddings")).scalar()
        print(f"DB Expert Embeddings Count: {count}")
    finally:
        db.close()

    print("\nTesting local embedding generation...")
    try:
        vec = generate_text_embedding("Weekdays after seven pm")
        if vec:
            print(f"✅ Local embedding generated: {vec[:5]}...")
        else:
            print("❌ Local embedding generation returned None")
    except Exception as e:
        print(f"❌ Local embedding generation failed: {e}")

    url = "http://127.0.0.2:8000/api/v1/profiles/semantic-search"
    params = {
        "q_text": "Weekdays after seven pm",
        "top_k": 5
    }
    
    print(f"\nTesting endpoint: {url}")
    print(f"Params: {params}")
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        print(f"\nResponse Status: {response.status_code}")
        print(f"Found {len(data)} experts")
        
        found = False
        for expert in data:
            print(f"- {expert.get('full_name')} | {expert.get('availability')}")
            if "Weekdays after 7pm" in expert.get('availability', '') or "Weekdays after 7pm" in expert.get('bio', ''):
                found = True
        
        if found:
            print("\n✅ SUCCESS: Found expert matching 'Weekdays after 7pm'")
        else:
            print("\n❌ FAILURE: Did not find expert matching 'Weekdays after 7pm'")
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        if hasattr(e, 'response') and e.response is not None:
             print(f"Response content: {e.response.text}")

if __name__ == "__main__":
    verify_search()
