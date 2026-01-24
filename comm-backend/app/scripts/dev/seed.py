from __future__ import annotations

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from passlib.context import CryptContext
from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models.user import Profile, User


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _run_migrations() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    alembic_cfg = Config(str(repo_root / "alembic.ini"))
    command.upgrade(alembic_cfg, "head")


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
    password = "123123"
    roles = [
        ("admin@gmail.com", "admin"),
        ("moderator@gmail.com", "moderator"),
        ("student@gmail.com", "student"),
    ]
    for email, nickname in roles:
        await _ensure_user(email=email, password=password, nickname=nickname)


if __name__ == "__main__":
    _run_migrations()
    asyncio.run(main())

