from sqlalchemy import create_engine, text
from app.database.database import SessionLocal
from app.services.ai_service import generate_text_embedding, _vec_to_pg
import uuid

def update_embedding():
    db = SessionLocal()
    # 1. Fetch Profile by availability (since user ID might change)
    # The user set availability: "I am usually available on Weekdays after 7pm, I can also do weekends if booked in advance"
    target_avail = "I am usually available on Weekdays after 7pm%"
    res = db.execute(text("SELECT user_id, full_name, bio, availability FROM profiles WHERE availability ILIKE :avail"), {"avail": target_avail}).fetchone()
    
    if not res:
        print("Profile not found with the specific availability")
        # Fallback to hardcoded ID if needed, or just list all
        res = db.execute(text("SELECT user_id, full_name, bio, availability FROM profiles LIMIT 1")).fetchone()
        if res:
             print(f"Fallback to first profile found: {res[0]}")
        else:
             return
    
    user_id, full_name, bio, availability = res
    print(f"Found User: {user_id}")
    print(f"Profile: {full_name}, Bio: {bio}, Avail: {availability}")
    
    # 2. Generate Embedding
    src = f"{full_name}\n{bio or ''}\navailability:{availability or ''}"
    print(f"Generating embedding for source: {src[:50]}...")
    vec = generate_text_embedding(src)
    if not vec:
        print("Embedding generation failed")
        return
        
    emb = _vec_to_pg(vec)
    
    # 3. Upsert
    sql = text("""
        INSERT INTO expert_embeddings(user_id, embedding, source_text)
        VALUES (:uid, CAST(:emb AS vector), :src)
        ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding, source_text = EXCLUDED.source_text
    """)
    db.execute(sql, {"uid": user_id, "emb": emb, "src": src})
    db.commit()
    print("Embedding updated successfully.")

if __name__ == "__main__":
    update_embedding()
