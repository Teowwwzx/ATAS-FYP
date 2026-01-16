# backend/app/core/redis.py
import redis
import os

# 使用环境变量，本地默认 localhost，上线 Render 后会自动读取 REDIS_URL
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# 创建连接池（大厂规范：复用连接，不要每次都创建）
pool = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=True)
redis_client = redis.Redis(connection_pool=pool)