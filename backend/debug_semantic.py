
import logging
import os
import sys
from sqlalchemy import create_engine, text
import numpy as np
from app.database.database import DATABASE_URL
from app.services.ai_service import generate_text_embedding, _vec_to_pg

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_semantic():
    engine = create_engine(DATABASE_URL)
    
    print("\n--- 1. Checking DB Content ---")
    with engine.connect() as conn:
        # Fetch expert embedding
        row = conn.execute(text("SELECT user_id, embedding, source_text FROM expert_embeddings LIMIT 1")).fetchone()
        if not row:
            print("CRITICAL: No expert embeddings found in DB!")
            return
        
        user_id, db_emb_str, src = row
        print(f"Found User: {user_id}")
        print(f"Source Text: {src[:50]}...")
        
        # Parse DB embedding
        # pgvector returns a string like "[0.1,0.2,...]" or a list depending on driver
        # psycopg2 usually returns string or list.
        print(f"DB Embedding Type: {type(db_emb_str)}")
        if isinstance(db_emb_str, str):
            db_vec = [float(x) for x in db_emb_str.strip("[]").split(",")]
        else:
            db_vec = db_emb_str
            
        print(f"DB Vector First 5: {db_vec[:5]}")
        print(f"DB Vector Norm: {np.linalg.norm(db_vec)}")
        
        if np.linalg.norm(db_vec) == 0:
             print("CRITICAL: DB Vector is ALL ZEROS!")

    print("\n--- 2. Generating Query Embedding ---")
    q_text = "Weekdays after seven pm"
    print(f"Query: '{q_text}'")
    
    q_vec = generate_text_embedding(q_text)
    if not q_vec:
        print("CRITICAL: Failed to generate query embedding!")
        return
        
    print(f"Query Vector First 5: {q_vec[:5]}")
    print(f"Query Vector Norm: {np.linalg.norm(q_vec)}")
    
    if np.linalg.norm(q_vec) == 0:
        print("CRITICAL: Query Vector is ALL ZEROS! (Check TESTING env var or Mock implementation)")

    print("\n--- 3. Manual Distance Calculation ---")
    # Cosine Distance = 1 - Cosine Similarity
    # Cosine Similarity = (A . B) / (|A| |B|)
    dot_product = np.dot(db_vec, q_vec)
    norm_a = np.linalg.norm(db_vec)
    norm_b = np.linalg.norm(q_vec)
    
    cosine_sim = dot_product / (norm_a * norm_b)
    cosine_dist = 1 - cosine_sim
    print(f"Manual Cosine Distance: {cosine_dist}")
    print(f"Manual Euclidean Distance: {np.linalg.norm(np.array(db_vec) - np.array(q_vec))}")

    print("\n--- 4. SQL Distance Calculation ---")
    with engine.connect() as conn:
        q_emb_pg = _vec_to_pg(q_vec)
        
        # Test 1: Literal Injection (Safe here for debug)
        sql = text(f"SELECT embedding <=> '{q_emb_pg}' as dist FROM expert_embeddings WHERE user_id = :uid")
        res = conn.execute(sql, {"uid": user_id}).fetchone()
        print(f"SQL Distance (Literal): {res[0]}")
        
        # Test 2: Parameter Binding
        try:
            sql = text("SELECT embedding <=> CAST(:emb AS vector) as dist FROM expert_embeddings WHERE user_id = :uid")
            res = conn.execute(sql, {"emb": q_emb_pg, "uid": user_id}).fetchone()
            print(f"SQL Distance (Binding): {res[0]}")
        except Exception as e:
            print(f"SQL Binding Failed: {e}")

if __name__ == "__main__":
    debug_semantic()
