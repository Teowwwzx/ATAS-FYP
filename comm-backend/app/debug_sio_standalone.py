import uvicorn
import socketio
from app.services.socket_manager import sio

# Simple ASGI app wrapping just the socketio server
app = socketio.ASGIApp(sio, socketio_path='socket.io')

if __name__ == "__main__":
    print("Starting debug SIO standalone server on 8003...")
    uvicorn.run(app, host="0.0.0.0", port=8003)
