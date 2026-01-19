from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings

Base = declarative_base()

def get_engine():
    url = settings.DATABASE_URL.replace("postgresql+psycopg2", "postgresql+asyncpg")
    return create_async_engine(url, future=True, echo=False)
