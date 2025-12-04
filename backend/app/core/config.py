from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str = "sqlite:///./test.db"
    SECRET_KEY: str = "dev-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESEND_API_KEY: str = ""
    SENDER_EMAIL: str = "noreply@example.com"
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""

settings = Settings()
