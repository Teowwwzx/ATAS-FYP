
import sys
import os
from sqlalchemy import text

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# FORCE correct database path
# Using NeonDB from .env or environment variable
# os.environ["DATABASE_URL"] should be set before running this if not using .env file loading logic 
# (but here we are forcing it for verification if needed, or relying on .env)

# REAL DATABASE FROM .env
if "DATABASE_URL" not in os.environ:
    # Fallback/Manual set for this script if needed, though usually loaded from .env
    os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_2VC8rBjtKkqG@ep-crimson-art-a10asco9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

print(f"Using Database: {os.environ['DATABASE_URL']}")

# from backend.app.core.config import settings
# print(f"Settings DATABASE_URL: {settings.DATABASE_URL}")

from backend.app.database.database import SessionLocal

def verify_experts():
    db = SessionLocal()
    try:
        # Use raw SQL to avoid model import issues
        # 1. Check raw users count
        count_query = text("SELECT COUNT(*) FROM users")
        count = db.execute(count_query).scalar()
        print(f"Total users in DB: {count}")
        
        # 2. List all users raw
        raw_query = text("SELECT id, email FROM users")
        raw_result = db.execute(raw_query)
        print("\nRaw Users:")
        for row in raw_result:
            print(f"{row[0]} | {row[1]}")

        # 3. Check table info for profiles (PostgreSQL compatible)
        print("\nChecking 'profiles' table columns:")
        try:
            columns_query = text("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'")
            columns = db.execute(columns_query)
            profile_columns = [row[0] for row in columns]
            print(profile_columns)
            
            has_can_be_speaker = 'can_be_speaker' in profile_columns
            print(f"Has 'can_be_speaker': {has_can_be_speaker}")
        except Exception as e:
            print(f"Error checking columns: {e}")
            has_can_be_speaker = False

        # 4. Modified query to be safe
        print("\nExperts in DB:")
        # Build query based on available columns
        select_clause = "u.id, p.full_name, r.name as role_name, p.visibility, p.is_onboarded"
        if has_can_be_speaker:
            select_clause += ", p.can_be_speaker"

        query = text(f"""
            SELECT {select_clause}
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'expert' OR u.email LIKE '%expert%'
        """)

        try:
            results = db.execute(query)
            
            print(f"{'ID':<36} | {'Full Name':<20} | {'Role':<10} | {'Vis':<10} | {'Onb':<5} | {'Speaker':<10}")
            print("-" * 110)
            
            for row in results:
                uid = str(row[0])
                name = row[1] if row[1] else "No Name"
                role = row[2] if row[2] else "N/A"
                vis = row[3] if row[3] else "N/A"
                onb = str(row[4]) if row[4] is not None else "N/A"
                speaker = str(row[5]) if has_can_be_speaker and len(row) > 5 else "N/A"
                
                print(f"{uid:<36} | {name:<20} | {role:<10} | {vis:<10} | {onb:<5} | {speaker:<10}")

        except Exception as e:
            print(f"Query Error: {e}")

        # 5. FIX EXPERTS
        # print("\nAPPLYING FIXES...")
        # try:
        #     # Fix e1: Set visibility to 'public'
        #     fix_e1 = text("UPDATE profiles SET visibility = 'public' WHERE full_name = 'e1'")
        #     db.execute(fix_e1)
        #     print("Fixed e1: Set visibility to 'public'")

        #     # Fix Amy Stokes: Set can_be_speaker = True, is_onboarded = True
        #     if has_can_be_speaker:
        #         fix_amy = text("UPDATE profiles SET can_be_speaker = true, is_onboarded = true WHERE full_name = 'Amy Stokes'")
        #         db.execute(fix_amy)
        #         print("Fixed Amy Stokes: Set can_be_speaker = true, is_onboarded = true")
            
        #     db.commit()
        #     print("Changes committed to DB.")
            
        # except Exception as e:
        #     print(f"Fix Error: {e}")
        #     db.rollback()

    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_experts()
