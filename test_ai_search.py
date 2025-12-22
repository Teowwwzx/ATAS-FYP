import os
import sys
import math
from dotenv import load_dotenv

# Load backend environment variables
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.ai_service import generate_text_embedding

def cosine_similarity(v1, v2):
    if not v1 or not v2: return 0.0
    dot_product = sum(a*b for a,b in zip(v1, v2))
    norm_a = math.sqrt(sum(a*a for a in v1))
    norm_b = math.sqrt(sum(b*b for b in v2))
    if norm_a == 0 or norm_b == 0: return 0.0
    return dot_product / (norm_a * norm_b)

def run_test():
    print("--- AI SEMANTIC MATCHING TEST (Real Gemini API) ---")
    
    # 1. Define the Expert's Availability (From User)
    expert_text = "I am usually available on Weekdays after 7pm, I can also do weekends if booked in advance."
    print(f"\n[Expert Availability]:\n'{expert_text}'")
    
    # 2. Define Queries
    queries = [
        "Looking for a speaker for Tuesday evening event",  # Should match "Weekdays after 7pm"
        "Need someone for a Saturday workshop",           # Should match "weekends"
        "Speaker for Monday morning 9am"                  # Should NOT match well
    ]
    
    # 3. Generate Expert Embedding
    print("\nGenerating Expert Embedding...")
    vec_expert = generate_text_embedding(expert_text)
    
    if not vec_expert:
        print("⚠️  API Key Failed or Limit Reached. Cannot verify with real AI.")
        return

    # 4. Test Queries
    for q in queries:
        print(f"\n[Query]: '{q}'")
        vec_q = generate_text_embedding(q)
        if vec_q:
            score = cosine_similarity(vec_expert, vec_q)
            print(f"   Similarity: {score:.4f}")
            if score > 0.6:
                print("   ✅ MATCH")
            else:
                print("   ❌ NO MATCH")
        else:
            print("   ⚠️ Failed to generate query embedding")

if __name__ == "__main__":
    run_test()
