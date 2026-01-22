from __future__ import annotations

import asyncio

from passlib.context import CryptContext
from sqlalchemy import select

from app.database.database import Base, get_engine
from app.database.session import AsyncSessionLocal
import app.models.community_model
import app.models.graph
import app.models.notification
from app.models.user import Profile, User


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def _ensure_schema() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _ensure_user(email: str, password: str, nickname: str) -> None:
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == email))
        existing = res.scalar_one_or_none()
        if existing:
            return
        user = User(email=email, hashed_password=pwd_context.hash(password))
        session.add(user)
        await session.flush()
        session.add(Profile(user_id=user.id, nickname=nickname))
        await session.commit()


async def main() -> None:
    await _ensure_schema()

    password = "123123"
    roles = [
        ("admin@gmail.com", "admin"),
        ("moderator@gmail.com", "moderator"),
        ("student@gmail.com", "student"),
    ]
    for email, nickname in roles:
        await _ensure_user(email=email, password=password, nickname=nickname)


if __name__ == "__main__":
    asyncio.run(main())

