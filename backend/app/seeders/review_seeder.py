import random
from faker import Faker
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.event_model import Event, EventParticipant, EventStatus
from app.models.organization_model import Organization
from app.models.review_model import Review

fake = Faker()

# Sample review comments based on rating
REVIEW_COMMENTS = {
    5: [
        "Excellent experience! Highly recommend.",
        "Outstanding work, exceeded expectations.",
        "Fantastic collaboration, very professional.",
        "Best experience I've had. Would work together again!",
        "Incredible skills and great communication.",
    ],
    4: [
        "Great experience overall. Very satisfied.",
        "Good collaboration, delivered quality work.",
        "Professional and reliable. Would recommend.",
        "Solid performance, met all expectations.",
        "Very good work ethic and results.",
    ],
    3: [
        "Decent experience. Some room for improvement.",
        "Average performance, met basic requirements.",
        "Okay experience, nothing special.",
        "Satisfactory work, but could be better.",
        "Met expectations but didn't exceed them.",
    ],
    2: [
        "Below expectations. Several issues encountered.",
        "Disappointing experience. Needs improvement.",
        "Not satisfied with the outcome.",
        "Had some challenges working together.",
        "Results were not as expected.",
    ],
    1: [
        "Very poor experience. Would not recommend.",
        "Major issues throughout. Unsatisfactory.",
        "Did not meet expectations at all.",
        "Unprofessional and unreliable.",
        "Extremely disappointed with the results.",
    ],
}


def seed_reviews(db: Session, num_reviews: int = 50):
    """Seed review records for events and organizations"""
    print(f"Seeding {num_reviews} reviews...")
    
    users = db.query(User).all()
    events = db.query(Event).filter(Event.status == EventStatus.ended).all()
    organizations = db.query(Organization).all()
    
    if not users:
        print("No users found, please seed users first.")
        return
    
    if not events and not organizations:
        print("No events (ended) or organizations found. Please seed them first.")
        return
    
    created = 0
    attempts = 0
    max_attempts = num_reviews * 3  # Prevent infinite loop
    
    while created < num_reviews and attempts < max_attempts:
        attempts += 1
        
        # Random rating (skewed towards positive)
        rating = random.choices(
            population=[1, 2, 3, 4, 5],
            weights=[5, 10, 20, 30, 35],  # More positive reviews
            k=1
        )[0]
        
        # Get random reviewer and reviewee
        reviewer = random.choice(users)
        reviewee = random.choice(users)
        
        # Don't allow self-reviews
        if reviewer.id == reviewee.id:
            continue
        
        # 70% event reviews, 30% organization reviews
        if events and random.random() < 0.7:
            event = random.choice(events)
            
            # Check if reviewer and reviewee were both participants
            participants = db.query(EventParticipant).filter(
                EventParticipant.event_id == event.id
            ).all()
            participant_ids = [p.user_id for p in participants]
            
            if reviewer.id not in participant_ids or reviewee.id not in participant_ids:
                continue
            
            # Check for duplicate review
            existing = db.query(Review).filter(
                Review.event_id == event.id,
                Review.reviewer_id == reviewer.id,
                Review.reviewee_id == reviewee.id
            ).first()
            
            if existing:
                continue
            
            review = Review(
                event_id=event.id,
                org_id=None,
                reviewer_id=reviewer.id,
                reviewee_id=reviewee.id,
                rating=rating,
                comment=random.choice(REVIEW_COMMENTS[rating]) if random.random() > 0.2 else None,
            )
        else:
            if not organizations:
                continue
                
            org = random.choice(organizations)
            
            # Check for duplicate review
            existing = db.query(Review).filter(
                Review.org_id == org.id,
                Review.reviewer_id == reviewer.id,
                Review.reviewee_id == reviewee.id
            ).first()
            
            if existing:
                continue
            
            review = Review(
                event_id=None,
                org_id=org.id,
                reviewer_id=reviewer.id,
                reviewee_id=reviewee.id,
                rating=rating,
                comment=random.choice(REVIEW_COMMENTS[rating]) if random.random() > 0.2 else None,
            )
        
        db.add(review)
        created += 1
    
    print(f"Successfully seeded {created} reviews")
