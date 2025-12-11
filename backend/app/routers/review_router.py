from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import uuid
from typing import List

from app.database.database import get_db
from app.dependencies import get_current_user, require_roles
from app.services.audit_service import log_admin_action
from app.models.user_model import User
from app.models.event_model import Event, EventParticipant
from app.models.review_model import Review
from app.schemas.review_schema import ReviewCreate, ReviewResponse

router = APIRouter()

@router.get("/reviews/event/{event_id}", response_model=List[ReviewResponse])
def list_event_reviews(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    items = (
        db.query(Review)
        .filter(Review.event_id == event_id, Review.deleted_at.is_(None))
        .order_by(Review.created_at.desc())
        .all()
    )
    return items

@router.post("/reviews", response_model=ReviewResponse)
def create_review(
    body: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == body.event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only allow reviews after event has ended
    now_utc = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    end_dt = event.end_datetime
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=__import__("datetime").timezone.utc)
    if now_utc < end_dt:
        raise HTTPException(status_code=400, detail="Event has not ended yet")

    # Must be organizer or a participant to review
    if event.organizer_id != current_user.id:
        link = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if link is None:
            raise HTTPException(status_code=403, detail="Join the event before reviewing")

    review = Review(
        event_id=event.id,
        reviewer_id=current_user.id,
        reviewee_id=body.reviewee_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    _update_profile_rating(db, review.reviewee_id)
    return review

@router.get("/reviews/by-user/{user_id}", response_model=List[ReviewResponse])
def list_reviews_by_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    items = (
        db.query(Review)
        .filter(Review.reviewee_id == user_id, Review.deleted_at.is_(None))
        .order_by(Review.created_at.desc())
        .all()
    )
    return items

@router.get("/reviews/me", response_model=ReviewResponse | None)
def get_my_review_for_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = (
        db.query(Review)
        .filter(
            Review.reviewer_id == current_user.id,
            Review.event_id == event_id,
            Review.deleted_at.is_(None)
        )
        .first()
    )
    return review

@router.get("/reviews", response_model=List[ReviewResponse])
def admin_list_reviews(
    reviewer_email: str | None = None,
    reviewee_email: str | None = None,
    event_id: uuid.UUID | None = None,
    min_rating: int | None = None,
    max_rating: int | None = None,
    start_after: __import__("datetime").datetime | None = None,
    end_before: __import__("datetime").datetime | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    from sqlalchemy.orm import aliased
    from app.models.user_model import User as U
    q = db.query(Review).filter(Review.deleted_at.is_(None))
    if reviewer_email or reviewee_email:
        rU = aliased(U)
        eU = aliased(U)
        q = q.join(rU, rU.id == Review.reviewer_id)
        q = q.join(eU, eU.id == Review.reviewee_id)
        if reviewer_email:
            q = q.filter(rU.email.ilike(f"%{reviewer_email}%"))
        if reviewee_email:
            q = q.filter(eU.email.ilike(f"%{reviewee_email}%"))
    if event_id:
        q = q.filter(Review.event_id == event_id)
    if min_rating is not None:
        q = q.filter(Review.rating >= min_rating)
    if max_rating is not None:
        q = q.filter(Review.rating <= max_rating)
    if start_after is not None:
        q = q.filter(Review.created_at >= start_after)
    if end_before is not None:
        q = q.filter(Review.created_at <= end_before)
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    items = (
        q.order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items

@router.get("/reviews/count")
def admin_count_reviews(
    reviewer_email: str | None = None,
    reviewee_email: str | None = None,
    event_id: uuid.UUID | None = None,
    min_rating: int | None = None,
    max_rating: int | None = None,
    start_after: __import__("datetime").datetime | None = None,
    end_before: __import__("datetime").datetime | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    from sqlalchemy.orm import aliased
    from app.models.user_model import User as U
    q = db.query(Review).filter(Review.deleted_at.is_(None))
    if reviewer_email or reviewee_email:
        rU = aliased(U)
        eU = aliased(U)
        q = q.join(rU, rU.id == Review.reviewer_id)
        q = q.join(eU, eU.id == Review.reviewee_id)
        if reviewer_email:
            q = q.filter(rU.email.ilike(f"%{reviewer_email}%"))
        if reviewee_email:
            q = q.filter(eU.email.ilike(f"%{reviewee_email}%"))
    if event_id:
        q = q.filter(Review.event_id == event_id)
    if min_rating is not None:
        q = q.filter(Review.rating >= min_rating)
    if max_rating is not None:
        q = q.filter(Review.rating <= max_rating)
    if start_after is not None:
        q = q.filter(Review.created_at >= start_after)
    if end_before is not None:
        q = q.filter(Review.created_at <= end_before)
    total = q.with_entities(Review.id).distinct().count()
    return {"total_count": total}

@router.delete("/reviews/{review_id}", response_model=ReviewResponse)
def admin_delete_review(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
    reason: str | None = Body(None),
):
    item = db.query(Review).filter(Review.id == review_id, Review.deleted_at.is_(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Review not found")
    item.deleted_at = func.now()
    db.add(item)
    db.commit()
    log_admin_action(db, current_user.id, "review.delete", "review", review_id, details=(reason or None))
    _update_profile_rating(db, item.reviewee_id)
    return item

def _update_profile_rating(db: Session, user_id: uuid.UUID):
    from app.models.profile_model import Profile
    avg = db.query(func.avg(Review.rating)).filter(Review.reviewee_id == user_id, Review.deleted_at.is_(None)).scalar()
    avg = float(avg) if avg is not None else 0.0
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile:
        profile.average_rating = avg
        db.add(profile)
        db.commit()
