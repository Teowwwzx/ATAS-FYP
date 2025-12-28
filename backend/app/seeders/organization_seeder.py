import random
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.organization_model import Organization, OrganizationType, OrganizationVisibility, OrganizationRole, organization_members
import urllib.parse

fake = Faker()

# Real cover images for organizations
ORG_COVER_IMAGES = [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&h=400&fit=crop",
    "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=1200&h=400&fit=crop",
]

def get_org_logo_url(org_name: str) -> str:
    """Generate a logo URL based on organization name using Placehold.co"""
    # Extract initials from organization name
    words = org_name.split()[:2]
    initials = ''.join([word[0].upper() for word in words if word])
    # Create URL with organization initials
    encoded_name = urllib.parse.quote(initials)
    return f"https://placehold.co/200x200.png?text={encoded_name}"

def seed_organizations(db: Session, num_organizations: int):
    """Seed organizations table with fake data"""
    print(f"Seeding {num_organizations} organizations...")
    
    users = db.query(User).all()
    if not users:
        print("No users found, please seed users first.")
        return

    for idx in range(num_organizations):
        owner = random.choice(users)
        org_name = fake.company()
        
        organization = Organization(
            owner_id=owner.id,
            name=org_name,
            logo_url=get_org_logo_url(org_name),
            cover_url=ORG_COVER_IMAGES[idx % len(ORG_COVER_IMAGES)],
            description=fake.text(max_nb_chars=300),
            type=random.choice(list(OrganizationType)),
            website_url=fake.url() if random.random() > 0.2 else None,
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
        num_members = random.randint(2, 10)
        available_users = [user for user in users if user.id != owner.id]
        members = random.sample(available_users, min(num_members, len(available_users)))
        for member in members:
            membership = {
                "org_id": organization.id,
                "user_id": member.id,
                "role": random.choice([OrganizationRole.admin, OrganizationRole.member])
            }
            db.execute(organization_members.insert().values(membership))

    db.commit()
    print(f"Successfully seeded {num_organizations} organizations.")