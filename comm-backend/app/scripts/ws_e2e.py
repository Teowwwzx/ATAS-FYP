from __future__ import annotations

import time
from threading import Event

import requests
import socketio


BASE_URL = "http://localhost:8001"


def _login(email: str, password: str) -> str:
    r = requests.post(
        f"{BASE_URL}/v1/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _me(token: str) -> dict:
    r = requests.get(
        f"{BASE_URL}/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def _create_post(token: str, title: str) -> dict:
    r = requests.post(
        f"{BASE_URL}/v1/posts",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": title,
            "content": "hello",
            "media_urls": [],
            "tags": ["test"],
            "location": "Library",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def _create_comment(token: str, post_id: str, content: str) -> dict:
    r = requests.post(
        f"{BASE_URL}/v1/comments",
        headers={"Authorization": f"Bearer {token}"},
        json={"post_id": post_id, "content": content, "parent_id": None},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def main() -> None:
    admin_token = _login("admin@gmail.com", "123123")
    student_token = _login("student@gmail.com", "123123")

    admin = _me(admin_token)
    post = _create_post(admin_token, "ws smoke")

    got_new_comment = Event()
    got_notification = Event()

    sio = socketio.Client(reconnection=False)

    @sio.event
    def connect():
        sio.emit("join_user_room", admin["id"])
        sio.emit("join_post_room", post["id"])

    @sio.on("new_comment")
    def on_new_comment(data):
        got_new_comment.set()

    @sio.on("notification")
    def on_notification(data):
        got_notification.set()

    sio.connect(BASE_URL, socketio_path="ws/socket.io", wait_timeout=10)
    time.sleep(0.5)

    _create_comment(student_token, post["id"], "hi from student")

    ok_comment = got_new_comment.wait(timeout=10)
    ok_notify = got_notification.wait(timeout=10)
    sio.disconnect()

    print({"new_comment": ok_comment, "notification": ok_notify})


if __name__ == "__main__":
    main()

