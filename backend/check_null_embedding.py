from sqlalchemy import create_engine, text
from app.database.database import DATABASE_URL

def check_null():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Check if embedding is null
        result = conn.execute(text("SELECT user_id, embedding IS NULL FROM expert_embeddings"))
        rows = result.fetchall()
        print(f"Total rows: {len(rows)}")
        for r in rows:
            print(f"User: {r[0]}, Embedding IS NULL: {r[1]}")
            
        # Try a simple vector op
        try:
            res = conn.execute(text("SELECT embedding <=> embedding FROM expert_embeddings LIMIT 1")).fetchone()
            print(f"Self distance: {res[0]}")
            
            # Try with literal
            vec_str = "[" + ",".join(["0.0"] * 768) + "]"
            sql = text(f"SELECT user_id, embedding <=> '{vec_str}' as dist FROM expert_embeddings LIMIT 1")
            res = conn.execute(sql).fetchone()
            print(f"Distance to zero vector: {res[1]}")
            
            # Try with cast
            sql = text(f"SELECT user_id, embedding <=> CAST('{vec_str}' AS vector) as dist FROM expert_embeddings LIMIT 1")
            res = conn.execute(sql).fetchone()
            print(f"Distance to zero vector (CAST): {res[1]}")
            
            # Try with binding
            sql = text("SELECT user_id, embedding <=> CAST(:emb AS vector) as dist FROM expert_embeddings LIMIT 1")
            res = conn.execute(sql, {"emb": vec_str}).fetchone()
            print(f"Distance to zero vector (BINDING): {res[1]}")

        except Exception as e:
            print(f"Vector op failed: {e}")

if __name__ == "__main__":
    check_null()