# profile_router.py


from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.database.database import get_db
from app.schemas.profile_schema import ProfileCreate, ProfileResponse, ProfileUpdate, OnboardingUpdate
from app.models.user_model import User
from app.services import profile_service, user_service
from app.dependencies import get_current_user, get_current_user_optional
from typing import List
from fastapi import File, UploadFile
from sqlalchemy import or_, text
from app.services.ai_service import generate_text_embedding, _vec_to_pg
from sqlalchemy.sql import func
from app.models.profile_model import Profile, ProfileVisibility, Tag, profile_tags, Education, JobExperience
from app.schemas.profile_schema import (
    ProfileCreate, ProfileResponse, ProfileUpdate, OnboardingUpdate,
    EducationCreate, EducationResponse,
    JobExperienceCreate, JobExperienceResponse
)
from app.models.skill_model import Skill
from app.models.profile_model import profile_skills
from app.models.user_model import User as UserModel
from app.dependencies import require_roles
from app.models.notification_model import Notification, NotificationType
from app.models.user_model import Role, user_roles

router = APIRouter()

# Simple in-memory onboarding settings. Replace with DB storage as needed.
ONBOARDING_SETTINGS: dict = {
    "enabled_fields": ["full_name", "role"],
    "required_fields": ["full_name", "role"],
}

@router.get("/discover", response_model=List[ProfileResponse])
def discover_profiles(
    name: str | None = "",
    tag_ids: List[uuid.UUID] | None = None,
    skill_ids: List[uuid.UUID] | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(Profile)
    if name:
        q = q.filter(Profile.full_name.ilike(f"%{name}%"))
    from app.models.review_model import Review
    q = q.join(User, User.id == Profile.user_id)
    q = q.join(user_roles, user_roles.c.user_id == User.id)
    q = q.join(Role, Role.id == user_roles.c.role_id)
    q = q.filter(Role.name == "expert")
    q = q.filter(Profile.visibility == ProfileVisibility.public)
    if tag_ids:
        q = q.join(profile_tags, profile_tags.c.profile_id == Profile.id)
        q = q.filter(profile_tags.c.tag_id.in_(tag_ids))
    if skill_ids:
        q = q.join(profile_skills, profile_skills.c.profile_id == Profile.id)
        q = q.filter(profile_skills.c.skill_id.in_(skill_ids))
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    items = (
        q.distinct()
        .order_by(Profile.average_rating.desc(), Profile.full_name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    result: List[ProfileResponse] = []
    for p in items:
        avg = (
            db.query(func.coalesce(func.avg(Review.rating), 0.0))
            .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
            .scalar()
            or 0.0
        )
        cnt = (
            db.query(func.count(Review.id))
            .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
            .scalar()
            or 0
        )
        pr = ProfileResponse.model_validate({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name,
            "bio": p.bio,
            "title": p.title,
            "availability": p.availability,
            "avatar_url": p.avatar_url,
            "cover_url": p.cover_url,
            "linkedin_url": p.linkedin_url,
            "github_url": p.github_url,
            "instagram_url": p.instagram_url,
            "twitter_url": p.twitter_url,
            "website_url": p.website_url,
            "visibility": p.visibility,
            "tags": p.tags,
            "educations": p.educations,
            "job_experiences": p.job_experiences,
            "average_rating": float(avg),
            "reviews_count": int(cnt),
        })
        result.append(pr)
    return result

@router.get("/discover/count")
def discover_profiles_count(
    name: str | None = "",
    tag_ids: List[uuid.UUID] | None = None,
    skill_ids: List[uuid.UUID] | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Profile)
    if name:
        q = q.filter(Profile.full_name.ilike(f"%{name}%"))
    q = q.join(User, User.id == Profile.user_id)
    q = q.join(user_roles, user_roles.c.user_id == User.id)
    q = q.join(Role, Role.id == user_roles.c.role_id)
    q = q.filter(Role.name == "expert")
    q = q.filter(Profile.visibility == ProfileVisibility.public)
    if tag_ids:
        q = q.join(profile_tags, profile_tags.c.profile_id == Profile.id)
        q = q.filter(profile_tags.c.tag_id.in_(tag_ids))
    if skill_ids:
        q = q.join(profile_skills, profile_skills.c.profile_id == Profile.id)
        q = q.filter(profile_skills.c.skill_id.in_(skill_ids))
    total = q.with_entities(Profile.id).distinct().count()
    return {"total_count": total}

@router.get("/semantic-search", response_model=List[ProfileResponse])
def semantic_search_profiles(
    embedding: str | None = None,
    q_text: str | None = None,
    top_k: int = 20,
    db: Session = Depends(get_db),
):
    user_ids: list[uuid.UUID] = []
    if embedding:
        try:
            sql = text(
                "SELECT user_id FROM expert_embeddings ORDER BY embedding <-> CAST(:emb AS vector) LIMIT :k"
            )
            rows = db.execute(sql, {"emb": embedding, "k": top_k}).fetchall()
            user_ids = [r[0] for r in rows]
        except Exception:
            db.rollback()
            user_ids = []
    elif q_text:
        try:
            vec = generate_text_embedding(q_text)
            if vec:
                emb = _vec_to_pg(vec)
                sql = text(
                    "SELECT user_id FROM expert_embeddings ORDER BY embedding <-> CAST(:emb AS vector) LIMIT :k"
                )
                rows = db.execute(sql, {"emb": emb, "k": top_k}).fetchall()
                user_ids = [r[0] for r in rows]
        except Exception:
            db.rollback()
            user_ids = []

    profiles_q = db.query(Profile)
    profiles_q = profiles_q.join(User, User.id == Profile.user_id)
    profiles_q = profiles_q.join(user_roles, user_roles.c.user_id == User.id)
    profiles_q = profiles_q.join(Role, Role.id == user_roles.c.role_id)
    profiles_q = profiles_q.filter(Role.name == "expert")
    profiles_q = profiles_q.filter(Profile.visibility == ProfileVisibility.public)
    if user_ids:
        items = profiles_q.filter(Profile.user_id.in_(user_ids)).all()
        order = {uid: idx for idx, uid in enumerate(user_ids)}
        items.sort(key=lambda p: order.get(p.user_id, 10**9))
        result: List[ProfileResponse] = []
        from app.models.review_model import Review
        for p in items[:top_k]:
            avg = (
                db.query(func.coalesce(func.avg(Review.rating), 0.0))
                .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
                .scalar()
                or 0.0
            )
            cnt = (
                db.query(func.count(Review.id))
                .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
                .scalar()
                or 0
            )
            pr = ProfileResponse.model_validate({
                "id": p.id,
                "user_id": p.user_id,
                "full_name": p.full_name,
                "bio": p.bio,
                "title": p.title,
                "availability": p.availability,
                "avatar_url": p.avatar_url,
                "cover_url": p.cover_url,
                "linkedin_url": p.linkedin_url,
                "github_url": p.github_url,
                "instagram_url": p.instagram_url,
                "twitter_url": p.twitter_url,
                "website_url": p.website_url,
                "visibility": p.visibility,
                "tags": p.tags,
                "educations": p.educations,
                "job_experiences": p.job_experiences,
                "average_rating": float(avg),
                "reviews_count": int(cnt),
            })
            result.append(pr)
        return result
    elif q_text:
        profiles_q = profiles_q.filter(Profile.full_name.ilike(f"%{q_text}%"))
    profiles = profiles_q.limit(top_k).all()
    result: List[ProfileResponse] = []
    from app.models.review_model import Review
    for p in profiles:
        avg = (
            db.query(func.coalesce(func.avg(Review.rating), 0.0))
            .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
            .scalar()
            or 0.0
        )
        cnt = (
            db.query(func.count(Review.id))
            .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
            .scalar()
            or 0
        )
        pr = ProfileResponse.model_validate({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name,
            "bio": p.bio,
            "title": p.title,
            "availability": p.availability,
            "avatar_url": p.avatar_url,
            "cover_url": p.cover_url,
            "linkedin_url": p.linkedin_url,
            "github_url": p.github_url,
            "instagram_url": p.instagram_url,
            "twitter_url": p.twitter_url,
            "website_url": p.website_url,
            "visibility": p.visibility,
            "tags": p.tags,
            "educations": p.educations,
            "job_experiences": p.job_experiences,
            "average_rating": float(avg),
            "reviews_count": int(cnt),
        })
        result.append(pr)
    return result

@router.get("/semantic/profiles", response_model=List[ProfileResponse])
def semantic_search_profiles_alias(
    embedding: str | None = None,
    q_text: str | None = None,
    top_k: int = 20,
    db: Session = Depends(get_db),
):
    return semantic_search_profiles(embedding=embedding, q_text=q_text, top_k=top_k, db=db)
    
@router.get("/find", response_model=List[ProfileResponse])
def search_profiles(
    email: str = "",
    name: str = "",
    skill: str = "",
    role: str = "",
    db: Session = Depends(get_db),
):
    q = db.query(Profile).filter(Profile.visibility == ProfileVisibility.public)

    if email:
        from sqlalchemy.sql import func as sa_func
        q = q.join(User, User.id == Profile.user_id).filter(sa_func.lower(User.email).like(f"%{email.lower()}%"))
    
    if name:
        q = q.filter(Profile.full_name.ilike(f"%{name}%"))

    if skill:
        q = q.join(profile_skills, profile_skills.c.profile_id == Profile.id)\
             .join(Skill, Skill.id == profile_skills.c.skill_id)\
             .filter(Skill.name.ilike(f"%{skill}%"))

    if role:
        # Avoid double join if email already joined User
        if not email:
            q = q.join(User, User.id == Profile.user_id)
        
        q = q.join(user_roles, user_roles.c.user_id == User.id)\
             .join(Role, Role.id == user_roles.c.role_id)\
             .filter(Role.name.ilike(f"%{role}%"))

    results = q.distinct().limit(50).all()
    return results

@router.put("/me/onboarding", response_model=ProfileResponse)
def complete_onboarding(onboarding_data: OnboardingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile_update = ProfileUpdate(
        full_name=onboarding_data.full_name,
        bio=onboarding_data.bio,
        linkedin_url=onboarding_data.linkedin_url,
        github_url=onboarding_data.github_url,
        instagram_url=onboarding_data.instagram_url,
        twitter_url=onboarding_data.twitter_url,
        website_url=onboarding_data.website_url,
    )
    db_profile = profile_service.update_profile(db, user_id=current_user.id, profile=profile_update)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    desired_role = onboarding_data.role
    try:
        src = f"{db_profile.full_name}\n{db_profile.bio or ''}"
        vec = generate_text_embedding(src)
        if vec:
            emb = _vec_to_pg(vec)
            up = text(
                """
                INSERT INTO expert_embeddings(user_id, embedding, source_text)
                VALUES (:uid, CAST(:emb AS vector), :src)
                ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding, source_text = EXCLUDED.source_text
                """
            )
            db.execute(up, {"uid": current_user.id, "emb": emb, "src": src})
            db.commit()
    except Exception:
        pass
    if desired_role in ("expert", "sponsor"):
        pending_role = f"{desired_role}_pending"
        user_service.assign_role_to_user(db, user=current_user, role_name=pending_role)
        admin_users = (
            db.query(User)
            .join(user_roles, user_roles.c.user_id == User.id)
            .join(Role, Role.id == user_roles.c.role_id)
            .filter(func.lower(Role.name) == func.lower("admin"))
            .all()
        )
        for admin in admin_users:
            db.add(Notification(
                recipient_id=admin.id,
                actor_id=current_user.id,
                type=NotificationType.system,
                content=f"{desired_role.capitalize()} verification requested by {current_user.email}",
                link_url=f"/admin/users/{current_user.id}"
            ))
        db.commit()
    else:
        user_service.assign_role_to_user(db, user=current_user, role_name=desired_role)

    return db_profile

@router.get("/me", response_model=ProfileResponse)
def read_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_profile = profile_service.get_profile(db, user_id=current_user.id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile

@router.get("/{user_id}", response_model=ProfileResponse)
def read_profile(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_optional)):
    db_profile = profile_service.get_profile(db, user_id=user_id)
    if db_profile is None:
        if current_user is not None and current_user.id == user_id:
            db_profile = profile_service.create_profile(db, profile=ProfileCreate(full_name=""), user_id=user_id)
        else:
            raise HTTPException(status_code=404, detail="Profile not found")
    # Enforce visibility for private profiles
    if db_profile.visibility.value == "private":
        if current_user is None or current_user.id != user_id:
            raise HTTPException(status_code=403, detail="This profile is private")
    return db_profile

@router.post("/backfill")
def backfill_profiles(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    users = db.query(UserModel).all()
    created = 0
    for u in users:
        p = profile_service.get_profile(db, user_id=u.id)
        if p is None:
            profile_service.create_profile(db, profile=ProfileCreate(full_name=""), user_id=u.id)
            created += 1
    return {"created": created}

@router.get("", response_model=List[ProfileResponse])
def list_public_profiles(db: Session = Depends(get_db)):
    profiles = profile_service.list_profiles(db, visibility="public")
    return profiles

@router.put("/me", response_model=ProfileResponse)
def update_current_user_profile(
    profile: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    db_profile = profile_service.update_profile(
        db, user_id=user_id, profile=profile
    )
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile

 


@router.put("/me/avatar", response_model=ProfileResponse)
def update_my_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_profile = profile_service.update_avatar(db, user_id=current_user.id, avatar=avatar)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile


@router.put("/me/cover_picture", response_model=ProfileResponse)
def update_my_cover_picture(
    cover_picture: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_profile = profile_service.update_cover_picture(
        db, user_id=current_user.id, cover_picture=cover_picture
    )
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile
@router.post("/{user_id}", response_model=ProfileResponse)
def create_profile_for_user(user_id: uuid.UUID, body: ProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only create your own profile")
    existing = profile_service.get_profile(db, user_id=user_id)
    if existing is not None:
        return existing
    created = profile_service.create_profile(db, profile=body, user_id=user_id)
    return created

@router.post("/me/tags")
def attach_tag_to_my_profile(tag_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile(db, user_id=current_user.id)
    if profile is None:
        profile = profile_service.create_profile(db, profile=ProfileCreate(full_name=""), user_id=current_user.id)
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    existing = db.execute(profile_tags.select().where(
        profile_tags.c.profile_id == profile.id,
        profile_tags.c.tag_id == tag.id,
    )).fetchone()
    if existing is None:
        db.execute(profile_tags.insert().values(profile_id=profile.id, tag_id=tag.id))
        db.commit()
    return {"detail": "ok"}

@router.delete("/me/tags/{tag_id}", status_code=204)
def detach_tag_from_my_profile(tag_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile(db, user_id=current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.execute(profile_tags.delete().where(
        profile_tags.c.profile_id == profile.id,
        profile_tags.c.tag_id == tag_id,
    ))
    db.commit()
    return

@router.post("/me/skills")
def attach_skill_to_my_profile(skill_id: uuid.UUID, level: int = 1, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile(db, user_id=current_user.id)
    if profile is None:
        profile = profile_service.create_profile(db, profile=ProfileCreate(full_name=""), user_id=current_user.id)
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    if level < 1 or level > 5:
        raise HTTPException(status_code=400, detail="level must be between 1 and 5")
    existing = db.execute(profile_skills.select().where(
        profile_skills.c.profile_id == profile.id,
        profile_skills.c.skill_id == skill.id,
    )).fetchone()
    if existing is None:
        db.execute(profile_skills.insert().values(profile_id=profile.id, skill_id=skill.id, level=level))
    else:
        db.execute(profile_skills.update().where(
            profile_skills.c.profile_id == profile.id,
            profile_skills.c.skill_id == skill.id,
        ).values(level=level))
    db.commit()
    return {"detail": "ok"}

@router.delete("/me/skills/{skill_id}", status_code=204)
def detach_skill_from_my_profile(skill_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile(db, user_id=current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.execute(profile_skills.delete().where(
        profile_skills.c.profile_id == profile.id,
        profile_skills.c.skill_id == skill_id,
    ))
    db.commit()
    return
@router.get("/onboarding/settings")
def get_onboarding_settings():
    return ONBOARDING_SETTINGS

@router.put("/onboarding/settings")
def update_onboarding_settings(payload: dict, current_user: User = Depends(require_roles(["admin"]))):
    allowed = {
        "full_name",
        "role",
        "bio",
        "linkedin_url",
        "github_url",
        "instagram_url",
        "twitter_url",
        "website_url",
    }
    enabled = payload.get("enabled_fields") or []
    required = payload.get("required_fields") or []
    if not isinstance(enabled, list) or not isinstance(required, list):
        raise HTTPException(status_code=400, detail="enabled_fields and required_fields must be arrays")
    if not set(enabled).issubset(allowed) or not set(required).issubset(allowed):
        raise HTTPException(status_code=400, detail="Unknown field in settings")
    ONBOARDING_SETTINGS["enabled_fields"] = list(enabled)
    ONBOARDING_SETTINGS["required_fields"] = list(required)
    return ONBOARDING_SETTINGS

# --- Education ---

@router.post("/me/educations", response_model=EducationResponse)
def add_my_education(body: EducationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Education(**body.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/me/educations/{edu_id}", status_code=204)
def delete_my_education(edu_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Education).filter(Education.id == edu_id, Education.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Education not found")
    db.delete(item)
    db.commit()
    return

# --- Job Experience ---

@router.post("/me/job_experiences", response_model=JobExperienceResponse)
def add_my_job_experience(body: JobExperienceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = JobExperience(**body.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/me/job_experiences/{job_id}", status_code=204)
def delete_my_job_experience(job_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(JobExperience).filter(JobExperience.id == job_id, JobExperience.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Job Experience not found")
    db.delete(item)
    db.commit()
    return
