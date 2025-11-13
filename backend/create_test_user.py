import os
import sys
import random
import string

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.user_model import User, UserStatus
from app.models.profile_model import Profile
from app.core.security import get_password_hash

def generate_referral_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def create_test_user():
    db = SessionLocal()
    try:
        # Check if the user already exists
        existing_user = db.query(User).filter(User.email == 'test@example.com').first()

        if not existing_user:
            # Create a new user
            hashed_password = get_password_hash('password')
            new_user = User(
                email='test@example.com',
                password=hashed_password,
                is_verified=True,
                status=UserStatus.active,
                referral_code=generate_referral_code()
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            # Create a profile for the new user
            new_profile = Profile(
                user_id=new_user.id,
                full_name="Test User",
                bio="This is a test user."
            )
            db.add(new_profile)
            db.commit()

            print('User and profile created successfully.')
        else:
            # If user exists, check if they have a profile
            existing_profile = db.query(Profile).filter(Profile.user_id == existing_user.id).first()
            if not existing_profile:
                # Create a profile for the existing user
                new_profile = Profile(
                    user_id=existing_user.id,
                    full_name="Test User",
                    bio="This is a test user."
                )
                db.add(new_profile)
                db.commit()
                print('Profile created for existing user.')
            else:
                print('User and profile already exist.')
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()