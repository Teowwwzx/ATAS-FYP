from sqlalchemy import create_engine, text
from app.core.config import settings

def main():
    engine = create_engine(settings.DATABASE_URL)
    with engine.begin() as conn:
        # Add content column if missing, with a temporary default to avoid NOT NULL failure
        conn.exec_driver_sql(
            """
            ALTER TABLE event_proposal_comments
            ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
            """
        )
        # Drop the default to match model semantics
        conn.exec_driver_sql(
            """
            ALTER TABLE event_proposal_comments ALTER COLUMN content DROP DEFAULT;
            """
        )
        res = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='event_proposal_comments' AND column_name='content';"
            )
        )
        cols = [r[0] for r in res]
        print("content column present:", "content" in cols)

if __name__ == "__main__":
    main()

