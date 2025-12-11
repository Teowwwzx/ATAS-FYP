from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str = "sqlite:///./test.db"
    SECRET_KEY: str = "dev-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESEND_API_KEY: str = ""
    SENDER_EMAIL: str = "ATAS <onboarding@resend.dev>"
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # AI
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-1.5-flash"
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

settings = Settings()
