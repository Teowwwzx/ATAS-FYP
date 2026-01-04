
from app.database.database import SessionLocal
from app.models.user_model import User, Role, user_roles
from app.models.profile_model import Profile
from sqlalchemy import text

db = SessionLocal()

print("--- Testing Query Logic for role='student' ---")
q = db.query(Profile)

# Replicating the join logic
q = q.join(User, User.id == Profile.user_id)\
     .join(user_roles, user_roles.c.user_id == User.id)\
     .join(Role, Role.id == user_roles.c.role_id)\
     .filter(Role.name.ilike(f"%student%"))


# Test with subquery logic
print("\n--- Testing with Subquery Logic ---")
subq = q.with_entities(Profile.id).distinct().limit(50).subquery()
results = db.query(Profile).filter(Profile.id.in_(db.query(subq.c.id))).all()

print(f"Subquery result count: {len(results)}")

# Check if Robert Jones is in results
robert_in_results = any(p.full_name == "Robert Jones MD" for p in results) # using exact name from screenshot
# or ilike check
robert_in_results = any("Robert Jones" in p.full_name for p in results)

if robert_in_results:
    print(f"ERROR: Robert Jones found in subquery results!")
else:
    print("SUCCESS: Robert Jones NOT found in subquery results.")

