from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings
from app.database.session import get_session
from app.models.user import User, Profile
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
from fastapi import Header

def hash_password(p: str) -> str:
    return pwd_context.hash(p)

def verify_password(p: str, h: str) -> bool:
    return pwd_context.verify(p, h)

def create_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

@router.post("/register", response_model=UserResponse)
async def register(data: RegisterRequest, session: AsyncSession = Depends(get_session)):
    existing = await session.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=data.email, hashed_password=hash_password(data.password))
    session.add(user)
    await session.flush()
    profile = Profile(user_id=user.id, nickname=data.nickname)
    session.add(profile)
    await session.commit()
    return UserResponse(id=str(user.id), email=user.email, is_verified=user.is_verified)

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(User).where(User.email == data.email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(str(user.id))
    return TokenResponse(access_token=token)

@router.get("/me", response_model=UserResponse)
async def me(authorization: str | None = Header(default=None), session: AsyncSession = Depends(get_session)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    res = await session.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return UserResponse(id=str(user.id), email=user.email, is_verified=user.is_verified)
