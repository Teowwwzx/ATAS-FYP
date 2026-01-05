"""
Test script for AI proposal generation feature
Tests both authenticated and unauthenticated scenarios
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.2:8000/api/v1"

def print_divider(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")

def test_unauthenticated_proposal():
    """Test proposal generation without authentication (public access)"""
    print_divider("TEST 1: Unauthenticated Proposal Generation")
    
    url = f"{BASE_URL}/ai/generate-proposal"
    payload = {
        "expert_name": "Dr. Sarah Chen",
        "topic": "Machine Learning in Healthcare",
        "student_name": "Alex Johnson"
    }
    
    print(f"Sending request to: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nTitle: {data.get('title')}")
            print(f"\nDescription:\n{data.get('description')}")
            
            # Check if it's AI-generated (should have natural language, not rigid template)
            description = data.get('description', '')
            is_template = all(marker in description for marker in ['Introduction & Welcome', 'Keynote:', 'Interactive Q&A Session'])
           
            if is_template:
                print("\nWARNING: Response appears to be template-based, not AI-generated")
                return False
            else:
                print("\nSUCCESS: Response appears to be AI-generated (natural language)")
                return True
        else:
            print(f"\nError: {response.text}")
            return False
            
    except Exception as e:
        print(f"\nException: {str(e)}")
        return False

def test_authenticated_proposal():
    """Test proposal generation with authentication"""
    print_divider("TEST 2: Authenticated Proposal Generation")
    
    # First, login to get token
    login_url = f"{BASE_URL}/auth/login"
    login_payload = {
        "username": "admin@example.com",
        "password": "admin123"
    }
    
    print(f"Logging in as admin...")
    
    try:
        login_response = requests.post(login_url, data=login_payload, timeout=10)
        
        if login_response.status_code == 200:
            token = login_response.json().get('access_token')
            print(f"Login successful")
            
            # Now test proposal generation with auth
            url = f"{BASE_URL}/ai/generate-proposal"
            headers = {"Authorization": f"Bearer {token}"}
            payload = {
                "expert_name": "Prof. Emily Rodriguez",
                "topic": "Quantum Computing Applications",
                "student_name": ""  # Should use authenticated user's email
            }
            
            print(f"\nSending authenticated request to: {url}")
            print(f"Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            print(f"\nStatus Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"\nTitle: {data.get('title')}")
                print(f"\nDescription:\n{data.get('description')}")
                
                # Check if admin email is used
                description = data.get('description', '')
                has_email = 'admin@example.com' in description.lower()
                print(f"\nUser email in proposal: {'YES' if has_email else 'NO (uses different format)'}")
                
                return True
            else:
                print(f"\nError: {response.text}")
                return False
        else:
            print(f"\nLogin failed: {login_response.text}")
            return False
            
    except Exception as e:
        print(f"\nException: {str(e)}")
        return False

def test_different_topics():
    """Test with various topics to verify AI variation"""
    print_divider("TEST 3: AI Variation Test (Multiple Topics)")
    
    url = f"{BASE_URL}/ai/generate-proposal"
    topics = [
        ("Dr. James Liu", "Blockchain Technology in Finance"),
        ("Dr. Aisha Patel", "Climate Change Mitigation Strategies")
    ]
    
    results = []
    
    for expert, topic in topics:
        print(f"\nTesting: {topic}")
        payload = {
            "expert_name": expert,
            "topic": topic,
            "student_name": "Test Coordinator"
        }
        
        try:
            response = requests.post(url, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                description = data.get('description', '')
                results.append({
                    'topic': topic,
                    'expert': expert,
                    'description': description,
                    'length': len(description)
                })
                print(f"   Generated ({len(description)} chars)")
            else:
                print(f"   Failed: {response.status_code}")
                
        except Exception as e:
            print(f"   Exception: {str(e)}")
    
    # Check for variation
    if len(results) >= 2:
        print(f"\nVariation Analysis:")
        for i, result in enumerate(results, 1):
            print(f"\n   Result {i}: {result['topic']}")
            print(f"   Length: {result['length']} characters")
            print(f"   Expert mentioned: {'YES' if result['expert'] in result['description'] else 'NO'}")
            print(f"   Topic mentioned: {'YES' if result['topic'] in result['description'] else 'NO'}")
        
        # Check if responses are different (not identical templates)
        if len(set(r['description'] for r in results)) == len(results):
            print(f"\nSUCCESS: All responses are unique (AI is generating varied content)")
            return True
        else:
            print(f"\nWARNING: Some responses are identical")
            return False
    
    return False

def main():
    print("\n" + "="*80)
    print("  AI PROPOSAL GENERATION TEST SUITE")
    print("  Testing Gemini AI Integration")
    print("  " + str(datetime.now()))
    print("="*80)
    
    results = {
        "unauthenticated": False,
        "authenticated": False,
        "variation": False
    }
    
    # Run tests
    results["unauthenticated"] = test_unauthenticated_proposal()
    results["authenticated"] = test_authenticated_proposal()
    results["variation"] = test_different_topics()
    
    # Summary
    print_divider("TEST SUMMARY")
    print(f"Unauthenticated Access:  {'PASS' if results['unauthenticated'] else 'FAIL'}")
    print(f"Authenticated Access:    {'PASS' if results['authenticated'] else 'FAIL'}")
    print(f"AI Variation:            {'PASS' if results['variation'] else 'FAIL'}")
    
    total = sum(results.values())
    print(f"\nOverall: {total}/3 tests passed")
    
    if total == 3:
        print("\nALL TESTS PASSED! AI proposal generation is working correctly.")
    else:
        print(f"\n{3-total} test(s) failed. Review output above for details.")
    
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    main()
