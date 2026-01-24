import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
import uuid

@pytest.mark.asyncio
async def test_crud_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register a new user
        email = f"test_{uuid.uuid4()}@example.com"
        password = "password123"
        nickname = "Tester"
        
        reg_res = await client.post("/v1/auth/register", json={
            "email": email,
            "password": password,
            "nickname": nickname
        })
        assert reg_res.status_code == 200
        user_id = reg_res.json()["id"]

        # 2. Login to get token
        login_res = await client.post("/v1/auth/login", json={
            "email": email,
            "password": password
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create a Post
        post_data = {
            "title": "Test Post Title",
            "content": "This is a test post content.",
            "media_urls": [],
            "tags": ["test", "crud"],
            "location": "Test Lab"
        }
        post_res = await client.post("/v1/posts", json=post_data, headers=headers)
        assert post_res.status_code == 200
        post_id = post_res.json()["id"]
        assert post_res.json()["title"] == post_data["title"]

        # 4. List Posts and verify
        list_res = await client.get("/v1/posts", headers=headers)
        assert list_res.status_code == 200
        posts = list_res.json()
        assert any(p["id"] == post_id for p in posts)

        # 5. Create a Comment
        comment_data = {
            "post_id": post_id,
            "content": "This is a test comment."
        }
        comment_res = await client.post("/v1/comments", json=comment_data, headers=headers)
        assert comment_res.status_code == 200
        comment_id = comment_res.json()["id"]
        assert comment_res.json()["content"] == comment_data["content"]

        # 6. List Comments and verify
        comments_list_res = await client.get(f"/v1/posts/{post_id}/comments", headers=headers)
        assert comments_list_res.status_code == 200
        comments = comments_list_res.json()
        assert any(c["id"] == comment_id for c in comments)
