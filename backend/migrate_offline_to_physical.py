import sys
import os
from sqlalchemy import text, create_engine

# Set DATABASE_URL directly to ensure connection
os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_2VC8rBjtKkqG@ep-crimson-art-a10asco9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def migrate():
    print("Starting migration: offline -> physical (Core Mode)")
    # Create engine directly, bypassing app logic
    engine = create_engine(os.environ["DATABASE_URL"])
    
    try:
        with engine.connect() as conn:
            # Use AUTOCOMMIT for ALTER TYPE
            conn = conn.execution_options(isolation_level="AUTOCOMMIT")
            
            # 1. Check if 'physical' exists in Enum
            print("Checking Enum...")
            check_sql = text("SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'eventtype' AND enumlabel = 'physical'")
            exists = conn.execute(check_sql).scalar()
            
            if not exists:
                print("Adding 'physical' to eventtype...")
                conn.execute(text("ALTER TYPE eventtype ADD VALUE 'physical'"))
                print("Added 'physical' to eventtype.")
            else:
                print("'physical' already exists in eventtype.")
                
            # 2. Update Data
            print("Updating events from 'offline' to 'physical'...")
            update_sql = text("UPDATE events SET type = 'physical' WHERE type = 'offline'")
            res = conn.execute(update_sql)
            print(f"Updated {res.rowcount} rows.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate()
