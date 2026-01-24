from __future__ import annotations

from app.database.database import Base, get_engine

import app.models.community_model
import app.models.graph
import app.models.notification
import app.models.user


async def init_db_schema() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

