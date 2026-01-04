from sqlalchemy import create_engine, text
from app.core.config import settings

def main():
    engine = create_engine(settings.DATABASE_URL)
    with engine.begin() as conn:
        conn.exec_driver_sql(
            """
            DO $$ BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizationstatus') THEN 
                CREATE TYPE organizationstatus AS ENUM ('pending','approved','rejected'); 
            END IF; 
            END $$;
            """
        )
        conn.exec_driver_sql(
            """
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS status organizationstatus NOT NULL DEFAULT 'approved';
            """
        )
        conn.exec_driver_sql(
            """
            ALTER TABLE organizations ALTER COLUMN status DROP DEFAULT;
            """
        )
        res = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='organizations' AND column_name='status';"
            )
        )
        cols = [r[0] for r in res]
        print("status column present:", "status" in cols)

if __name__ == "__main__":
    main()

