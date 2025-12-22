from sqlalchemy import create_engine, text
from app.database.database import DATABASE_URL

def check_count():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT count(*) FROM expert_embeddings"))
        count = result.scalar()
        print(f"Expert embeddings count: {count}")
        
        result2 = conn.execute(text("SELECT user_id, source_text FROM expert_embeddings"))
        rows = result2.fetchall()
        for r in rows:
            print(f"User: {r[0]}, Source: {r[1][:50]}...")

if __name__ == "__main__":
    check_count()
