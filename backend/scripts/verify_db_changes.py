import sys
import os
from sqlalchemy import create_engine, inspect

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import settings

def verify_changes():
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    print("Checking 'events' table columns...")
    columns = [col['name'] for col in inspector.get_columns('events')]
    if 'price' in columns and 'currency' in columns:
        print("PASS: 'price' and 'currency' columns found in 'events'.")
    else:
        print(f"FAIL: 'price' or 'currency' missing in 'events'. Found: {columns}")

    print("\nChecking 'organizations' table columns...")
    columns = [col['name'] for col in inspector.get_columns('organizations')]
    if 'bank_details' in columns:
        print("PASS: 'bank_details' column found in 'organizations'.")
    else:
        print(f"FAIL: 'bank_details' missing in 'organizations'. Found: {columns}")
        
    print("\nChecking 'event_participants' table columns...")
    columns = inspector.get_columns('event_participants')
    payment_status = next((col for col in columns if col['name'] == 'payment_status'), None)
    if payment_status:
        print(f"PASS: 'payment_status' column found. Type: {payment_status['type']}")
    else:
        print("FAIL: 'payment_status' column missing.")

if __name__ == "__main__":
    verify_changes()
