import pytest
import time
import socketio
import requests
from threading import Event

# Configuration
BASE_URL = "http://127.0.0.1:8001"

# --- Helper Functions (Reusing logic but cleaner) ---

@pytest.fixture(scope="module")
def admin_token():
    # Ensure user exists
    requests.post(f"{BASE_URL}/v1/auth/register", json={
        "email": "admin@gmail.com", 
        "password": "123123",
        "username": "admin_user",
        "role": "student" # Assuming default or role field availability
    })
    # Login
    r = requests.post(f"{BASE_URL}/v1/auth/login", json={"email": "admin@gmail.com", "password": "123123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["access_token"]

@pytest.fixture(scope="module")
def student_token():
    # Ensure user exists
    requests.post(f"{BASE_URL}/v1/auth/register", json={
        "email": "student@gmail.com", 
        "password": "123123",
        "username": "student_user",
        "role": "student"
    })
    # Login
    r = requests.post(f"{BASE_URL}/v1/auth/login", json={"email": "student@gmail.com", "password": "123123"})
    assert r.status_code == 200, f"Student login failed: {r.text}"
    return r.json()["access_token"]

@pytest.fixture(scope="module")
def admin_user(admin_token):
    r = requests.get(f"{BASE_URL}/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    return r.json()

@pytest.fixture(scope="module")
def test_post(admin_token):
    """Creates a fresh post for testing"""
    payload = {
        "title": f"pytest_ws_{int(time.time())}",
        "content": "testing websockets",
        "media_urls": [],
        "tags": ["test"],
        "location": "Lab"
    }
    r = requests.post(f"{BASE_URL}/v1/posts", headers={"Authorization": f"Bearer {admin_token}"}, json=payload)
    assert r.status_code == 200
    return r.json()

# --- The E2E Test Case ---

def test_websocket_notification_flow(admin_token, student_token, admin_user, test_post):
    """
    Verifies the full real-time loop:
    1. Admin connects to WebSocket.
    2. Student follows Admin -> Admin gets 'new_follower' alert.
    3. Student comments on Post -> Admin gets 'new_comment' alert.
    """
    
    # 1. Setup WebSocket Client
    sio = socketio.Client(reconnection=False)
    
    got_new_follower = Event()
    got_new_comment = Event()
    
    @sio.event
    def connect():
        # Join rooms immediately upon connection
        sio.emit("join_user_room", admin_user["id"])
        sio.emit("join_post_room", test_post["id"])

    @sio.on("notification")
    def on_notification(data):
        print(f"\n[Pytest] Notification received: {data}")
        # Check if it's the follow notification
        if data.get("type") == "new_follower":
            got_new_follower.set()

    @sio.on("new_comment")
    def on_new_comment(data):
        print(f"\n[Pytest] Comment received: {data}")
        got_new_comment.set()

    # Connect to Server
    try:
        # socketio_path needs to match what is mounted in main.py ("/ws") + default engineio path ("socket.io")
        # In main.py: app.mount("/ws", socket_app)
        # So the full URL is http://localhost:8001/ws/socket.io/
        # Client automatically adds "socket.io", so we just need to point to the mount.
        # Wait... python-socketio client expects `socketio_path` to be the URL path suffix.
        # If server is at /ws/socket.io, then socketio_path should be 'ws/socket.io'
        sio.connect(
                BASE_URL,
                socketio_path="socket.io",
                wait_timeout=5,
                transports=['polling'],
                headers={"Authorization": f"Bearer {admin_token}"}
            )
    except Exception as e:
        pytest.fail(f"Could not connect to WebSocket server: {e}")

    time.sleep(1) # Wait for room join

    # 2. Trigger "Follow" Action (HTTP)
    r = requests.post(
        f"{BASE_URL}/v1/follow/{admin_user['id']}", 
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r.status_code == 200

    # Wait for Follow Notification
    assert got_new_follower.wait(timeout=5), "Did not receive 'new_follower' notification!"

    # 3. Trigger "Comment" Action (HTTP)
    r = requests.post(
        f"{BASE_URL}/v1/comments",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"post_id": test_post["id"], "content": "pytest comment", "parent_id": None}
    )
    assert r.status_code == 200

    # Wait for Comment Notification
    assert got_new_comment.wait(timeout=5), "Did not receive 'new_comment' broadcast!"

    # Cleanup
    sio.disconnect()
