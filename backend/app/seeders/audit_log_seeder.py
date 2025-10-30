import random
import uuid
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.audit_log_model import AuditLog

fake = Faker()

def seed_audit_logs(db: Session, num_audit_logs: int):
    """Seed audit_logs table with fake data"""
    print(f"Seeding {num_audit_logs} audit logs...")
    
    users = db.query(User).all()
    if not users:
        print("No users found, please seed users first.")
        return

    actions = ["create", "update", "delete", "login", "logout"]
    target_types = ["user", "profile", "organization", "event", "review"]

    for _ in range(num_audit_logs):
        user = random.choice(users)
        audit_log = AuditLog(
            user_id=user.id,
            action=random.choice(actions),
            target_type=random.choice(target_types),
            target_id=uuid.uuid4(),
            details=fake.text(max_nb_chars=100)
        )
        db.add(audit_log)

    db.commit()
    print(f"Successfully seeded {num_audit_logs} audit logs.")