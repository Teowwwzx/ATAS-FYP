import sys
import os
from sqlalchemy import create_engine, text
from app.database.database import Base, get_db, SessionLocal

from app.services.ai_service import generate_text_embedding, _vec_to_pg

def check_data():
    db = SessionLocal()
    try:
        # Check row count
        sql_count = text("SELECT count(*) FROM expert_embeddings")
        count = db.execute(sql_count).scalar()
        print(f"Total rows in expert_embeddings: {count}")
        
        # Generate embedding for "Weekdays after seven pm"
        query = "Weekdays after seven pm"
        print(f"\nGenerating embedding for '{query}'...")
        vec = generate_text_embedding(query)
        if vec:
            print(f"Vector generated. Length: {len(vec)}")
            print(f"Vector snippet: {vec[:5]}...")
            emb_str = _vec_to_pg(vec)
            
            # Check distance in DB with WHERE clause matching router
            threshold = 2.0
            print(f"\nTesting Query with threshold {threshold}...")
            
            sql_query = text(
                "SELECT user_id, embedding <=> CAST(:emb AS vector) as dist FROM expert_embeddings WHERE embedding <=> CAST(:emb AS vector) < :thresh ORDER BY dist"
            )
            
            rows = db.execute(sql_query, {"emb": emb_str, "thresh": threshold}).fetchall()
            print(f"Rows found: {len(rows)}")
            for r in rows:
                print(f"User {r[0]}: {r[1]}")
                
            # Also check 'Weekday 1pm'
            print("\n--- Checking 'Weekday 1pm' ---")
            query2 = "Weekday 1pm"
            vec2 = generate_text_embedding(query2)
            if vec2:
                emb_str2 = _vec_to_pg(vec2)
                rows2 = db.execute(sql_query, {"emb": emb_str2, "thresh": threshold}).fetchall()
                print(f"Rows found for '{query2}': {len(rows2)}")
                for r in rows2:
                    print(f"User {r[0]}: {r[1]}")
        else:
            print("Failed to generate embedding.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_data()
