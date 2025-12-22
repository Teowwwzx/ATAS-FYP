import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.session import DATABASE_URL

def check_embedding():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Find the expert
        # The user said: "I am usually available on Weekdays after 7pm..."
        # We'll search for this string in availability or bio
        search_str = "%Weekdays after 7pm%"
        
        sql = text("""
            SELECT p.user_id, p.full_name, p.availability, e.embedding IS NOT NULL as has_embedding
            FROM profiles p
            LEFT JOIN expert_embeddings e ON p.user_id = e.user_id
            WHERE p.availability ILIKE :s OR p.bio ILIKE :s
        """)
        
        result = session.execute(sql, {"s": search_str}).fetchall()
        
        if not result:
            print("No expert found with that availability text.")
            # List all profiles to see what we have
            all_pros = session.execute(text("SELECT full_name, availability FROM profiles LIMIT 5")).fetchall()
            print("First 5 profiles:", all_pros)
        else:
            for row in result:
                print(f"Found Expert: {row.full_name}")
                print(f"Availability: {row.availability}")
                print(f"Has Embedding: {row.has_embedding}")
                
                if not row.has_embedding:
                    print("WARNING: Expert has no embedding! Search will fail.")
                else:
                    print("SUCCESS: Expert has embedding.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    check_embedding()
