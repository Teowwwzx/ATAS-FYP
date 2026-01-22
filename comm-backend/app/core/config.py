from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://comm_user:password@localhost:5433/community"
    REDIS_URL: str = "redis://localhost:6379/1"
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None
    JWT_SECRET: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    CLOUDINARY_URL: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        extra="ignore",
    )

settings = Settings()
