import socketio
import uvicorn
from fastapi import FastAPI

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fastapi_app = FastAPI()

@fastapi_app.get("/health")
async def health():
    return {"status": "ok"}

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
