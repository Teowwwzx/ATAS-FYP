import socketio
import os

# 配置 Redis 作为消息中间件 (Message Queue)
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/1")

# 创建 Server 实例
# client_manager 让多个 API 实例可以通过 Redis 通信
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    client_manager=socketio.AsyncRedisManager(redis_url)
)

app = socketio.ASGIApp(sio)

# --- 事件处理 ---

@sio.event
async def connect(sid, environ):
    # 这里可以做 Token 验证
    print(f"Client connected: {sid}")

@sio.event
async def join_user_room(sid, user_id):
    """用户登录后，加入自己的私人频道"""
    await sio.enter_room(sid, f"user_{user_id}")
    print(f"User {user_id} joined room user_{user_id}")

@sio.event
async def join_post_room(sid, post_id):
    """用户浏览帖子时，加入帖子频道"""
    await sio.enter_room(sid, f"post_{post_id}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

# --- 供 API 调用的推送函数 ---

async def notify_user(user_id: str, event_type: str, data: dict):
    """
    给特定用户推消息 (例如: 你的帖子被赞了)
    """
    room = f"user_{user_id}"
    await sio.emit('notification', {'type': event_type, 'data': data}, room=room)

async def broadcast_to_post(post_id: str, new_comment: dict):
    """
    给正在看这个帖子的所有人推新评论
    """
    room = f"post_{post_id}"
    await sio.emit('new_comment', new_comment, room=room)