
from app.database.database import SessionLocal
from app.models.user_model import User, Role, user_roles
from app.models.profile_model import Profile
from sqlalchemy import text

db = SessionLocal()

# Check Alyssa Porter
print("\n--- Checking 'Alyssa Porter' ---")
wh = db.query(Profile).filter(Profile.full_name.ilike("%Alyssa Porter%")).first()
if wh:
    u = db.query(User).filter(User.id == wh.user_id).first()
    from sqlalchemy import text
    roles = db.execute(text(f"SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = '{u.id}'")).fetchall()
    role_names = [r[0] for r in roles]
    print(f"FOUND: ID={wh.id}, Name={wh.full_name}, Visibility={wh.visibility}, Roles={role_names}")
else:
    print("User 'Robert Jones' not found.")
