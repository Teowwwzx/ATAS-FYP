from pathlib import Path

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://comm_user:password@localhost:5433/community"
    REDIS_URL: str = "redis://localhost:6379/1"
    JWT_SECRET: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    CLOUDINARY_URL: Optional[str] = None

    class Config:
        env_file = str(Path(__file__).resolve().parents[2] / ".env")

settings = Settings()
