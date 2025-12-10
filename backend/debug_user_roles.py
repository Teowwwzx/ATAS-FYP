import sys
import os

# Create a module-level variable to store the session
db = None

try:
    # Add backend directory to sys.path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, 'app', '..')
    sys.path.append(backend_dir)

    from app.database.database import SessionLocal
    from app.models.user_model import User, Role

    db = SessionLocal()

    print(f"{'Role':<20} | {'User Name':<30} | {'Speaker?':<10} | {'Email'}")
    print("-" * 100)

    # Fetch all roles
    roles = db.query(Role).all()

    for role in roles:
        users = role.users
        if not users:
            print(f"{role.name:<20} | {'(No users)':<30} | {'-':<10} | -")
        for user in users:
            full_name = user.profile.full_name if user.profile else "No Profile"
            speaker = str(user.profile.can_be_speaker) if user.profile else "None"
            print(f"{role.name:<20} | {full_name:<30} | {speaker:<10} | {user.email}")
        print("-" * 100)

    # Check for users without any role
    users_without_role = db.query(User).filter(~User.roles.any()).all()
    if users_without_role:
        for user in users_without_role:
            full_name = user.profile.full_name if user.profile else "No Profile"
            speaker = str(user.profile.can_be_speaker) if user.profile else "None"
            print(f"{'(No Role)':<20} | {full_name:<30} | {speaker:<10} | {user.email}")

except Exception as e:
    print(f"An error occurred: {e}")
finally:
    if db:
        db.close()
