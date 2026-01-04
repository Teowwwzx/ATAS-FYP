from app.database.database import engine
from sqlalchemy import text

def add_proposal_id_to_participants():
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        try:
            # Check if column exists
            check_sql = text("SELECT column_name FROM information_schema.columns WHERE table_name='event_participants' AND column_name='proposal_id'")
            result = conn.execute(check_sql).fetchone()
            
            if not result:
                print("Adding proposal_id column to event_participants...")
                sql = text("ALTER TABLE event_participants ADD COLUMN proposal_id UUID REFERENCES event_proposals(id) ON DELETE SET NULL")
                conn.execute(sql)
                print("Column added successfully.")
            else:
                print("Column proposal_id already exists on event_participants.")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_proposal_id_to_participants()
