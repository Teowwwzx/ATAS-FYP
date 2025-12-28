import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# --- SQLAlchemy Setup ---
DATABASE_URL = settings.DATABASE_URL

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables. Please provide the full PostgreSQL connection string.")

engine = create_engine(DATABASE_URL)

# Construct the SQLAlchemy connection string


try:
    with engine.connect() as connection:
        print("Connection successful!")
except Exception as e:
    print(f"Failed to connect: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
TestingSessionLocal = Nonetest_engine = None
if os.environ.get("TESTING") == "1":
    # Use in-memory SQLite for testing to avoid creating local files
    test_engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Create a base class for declarative models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    if os.environ.get("TESTING") == "1" and TestingSessionLocal is not None:
        db = TestingSessionLocal()
    else:
        db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
