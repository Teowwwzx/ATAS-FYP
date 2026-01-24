import uvicorn
import socketio
from fastapi import FastAPI
from app.services.socket_manager import sio

# Create a minimal FastAPI app
fastapi_app = FastAPI()

@fastapi_app.get("/health")
async def health():
    return {"status": "ok"}

# Wrap it with Socket.IO
# Important: socketio_path defaults to 'socket.io', which means it handles /socket.io/...
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='socket.io')

if __name__ == "__main__":
    print("Starting debug SIO + FastAPI on 8003...")
    uvicorn.run(app, host="0.0.0.0", port=8003)
