from app.models.user_model import User, Role, UserStatus
from app.core.hashing import Hasher
from faker import Faker
import uuid
import random
import string
from datetime import datetime
from sqlalchemy.orm import Session

import time

fake = Faker()

def generate_referral_code(length=8):
    """Generate a random referral code"""
    letters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(letters) for i in range(length))

def seed_users(db: Session, num_students=10, num_experts=5, num_teachers=3, num_sponsors=2, num_admins=1):
    """Seed users table with fake data"""
    print(f"Seeding {num_students} students, {num_experts} experts, {num_teachers} teachers, {num_sponsors} sponsors, and {num_admins} admins...")
    
    # First, create roles if they don't exist
    roles = ["student", "expert", "teacher", "sponsor", "admin"]
    role_objects = {}
    for role_name in roles:
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name)
            db.add(role)
        role_objects[role_name] = role
    
    db.flush()  # Flush to get the role IDs
    
    # Create users for each role
    user_creations = {
        "student": num_students,
        "expert": num_experts,
        "teacher": num_teachers,
        "sponsor": num_sponsors,
        "admin": num_admins
    }
    
    total_users = 0
    for role_name, num_users in user_creations.items():
        for i in range(num_users):
            email = f"{role_name}{i+1}@mail.com"
            password = Hasher.get_password_hash("123123123")
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                continue
            user = User(
                id=uuid.uuid4(),
                email=email,
                password=password,
                is_verified=True,
                status=UserStatus.active,
                referral_code=generate_referral_code(),
                referred_by=None
            )
            user.roles.append(role_objects[role_name])
            db.add(user)
            total_users += 1
    
    print(f"Successfully seeded {total_users} users")
