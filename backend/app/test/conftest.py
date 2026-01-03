import os
import pytest
from dotenv import load_dotenv

# Explicitly load .env from backend directory
# Assume running from root, or relative to this file
# conftest is at backend/app/test/conftest.py
# .env is at backend/.env
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
env_path = os.path.join(current_dir, "..", "..", ".env")
load_dotenv(env_path)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.database import get_db, Base
# Import config to ensure env vars are loaded if needed, though usually loaded by app.
from app.core.config import settings

# Use the real DATABASE_URL from environment (Neon DB)
# WARNING: This will drop tables in the target DB as per client/db fixtures below.
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    # Fallback or error if not set? 
    # Current codebase might expect it in settings.
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
    
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL not found for testing. Please ensure .env is loaded.")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

# We still set TESTING=1 to maybe trigger other test-specific logic
os.environ["TESTING"] = "1"

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def _restore_dep_overrides():
    app.dependency_overrides[get_db] = override_get_db
    yield

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    # Create tables once if they don't exist
    Base.metadata.create_all(bind=engine)
    yield

def cleanup_db(session):
    # Disable constraints typically not needed for delete if we delete in order or use cascade
    # For Postgres, TRUNCATE CASCADE is best but might lock.
    # Let's use DELETE on all tables in reverse dependency order.
    # Base.metadata.sorted_tables gives order of creation (dependencies first).
    # So we delete in reversed(sorted_tables).
    
    # However, if foreign keys are enforced, we might need to be careful.
    # A simple approach for tests (if data is small) is just delete all.
    
    for table in reversed(Base.metadata.sorted_tables):
        try:
            session.execute(table.delete())
        except Exception:
            pass # Ignore errors if table doesn't exist or other issues (best effort)
    session.commit()

@pytest.fixture(scope="function")
def db():
    # Create a new session for the test
    db = TestingSessionLocal()
    
    # Clean DB before test
    cleanup_db(db)
    
    try:
        yield db
    finally:
        db.close()

