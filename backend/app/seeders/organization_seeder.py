import random
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.organization_model import Organization, OrganizationType, OrganizationVisibility, OrganizationRole, organization_members

fake = Faker()

def seed_organizations(db: Session, num_organizations: int):
    """Seed organizations table with fake data"""
    print(f"Seeding {num_organizations} organizations...")
    
    users = db.query(User).all()
    if not users:
        print("No users found, please seed users first.")
        return

    for _ in range(num_organizations):
        owner = random.choice(users)
        organization = Organization(
            owner_id=owner.id,
            name=fake.company(),
            logo_url=fake.image_url(),
            cover_url=fake.image_url(),
            description=fake.text(max_nb_chars=200),
            type=random.choice(list(OrganizationType)),
            website_url=fake.url(),
            location=fake.city(),
            visibility=random.choice(list(OrganizationVisibility)),
        )
        db.add(organization)
        db.flush()  # Flush to get the organization id

        # Add owner as a member
        owner_membership = {
            "org_id": organization.id,
            "user_id": owner.id,
            "role": OrganizationRole.owner
        }
        db.execute(organization_members.insert().values(owner_membership))

        # Add random members
        num_members = random.randint(1, 10)
        members = random.sample([user for user in users if user.id != owner.id], num_members)
        for member in members:
            membership = {
                "org_id": organization.id,
                "user_id": member.id,
                "role": random.choice([OrganizationRole.admin, OrganizationRole.member])
            }
            db.execute(organization_members.insert().values(membership))

    db.commit()
    print(f"Successfully seeded {num_organizations} organizations.")