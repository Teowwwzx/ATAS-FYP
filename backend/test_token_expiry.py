import requests
from datetime import datetime, timedelta, timezone
import uuid
import sys
import os

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database.database import SessionLocal
from app.models.user_model import User

# Base URL for the API
BASE_URL = "http://127.0.0.1:8000"

def test_token_expiration():
    # Create session
    db = SessionLocal()
    
    try:
        # 1. Create a dummy user
        email = f"test_expiry_{uuid.uuid4().hex[:8]}@example.com"
        password = "TestPassword123!"
        
        print(f"Creating user for test: {email}")
        # We can use the register endpoint to ensure normal flow
        reg_response = requests.post(f"{BASE_URL}/api/v1/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Test Expiry User"
        })
        
        if reg_response.status_code != 200:
            print(f"Registration failed: {reg_response.text}")
            return

        # 2. Fetch user from DB
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print("User not found in DB")
            return
            
        original_token = user.verification_token
        print(f"Original token: {original_token}")
        
        # 3. Manually expire the token
        print("Manually expiring the token...")
        user.verification_token_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
        
        # 4. Try to verify with the expired token
        print("Attempting verification with expired token...")
        verify_response = requests.post(f"{BASE_URL}/api/v1/auth/verify", json={
            "email": email,
            "code": original_token
        })
        
        print(f"Response status: {verify_response.status_code}")
        print(f"Response body: {verify_response.json()}")
        
        if verify_response.status_code == 400 and "expired" in verify_response.text.lower():
            print("SUCCESS: Verification failed as expected for expired token.")
        else:
            print("FAILURE: Verification did not fail as expected.")
            
        # 5. Resend verification
        print("Resending verification email...")
        resend_response = requests.post(f"{BASE_URL}/api/v1/auth/resend-verification", json={
            "email": email
        })
        
        if resend_response.status_code == 200:
            print("Resend successful.")
            db.refresh(user)
            print(f"New token expires at: {user.verification_token_expires_at}")
            
            # Check if expiry is in future (allow for small time diffs)
            if user.verification_token_expires_at > datetime.now(timezone.utc):
                print("SUCCESS: New token expiration is in the future.")
            else:
                print("FAILURE: New token is still expired.")
        else:
            print("Resend failed: {resend_response.text}")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_token_expiration()
