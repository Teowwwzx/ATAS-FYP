from sqlalchemy import text
from app.database.database import engine

with engine.connect() as conn:
    conn.execute(text("DELETE FROM alembic_version"))
    conn.commit()
    print("Deleted alembic_version row")
