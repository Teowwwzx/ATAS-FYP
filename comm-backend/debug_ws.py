import socketio
import time

sio = socketio.Client()

def try_connect(url, path):
    print(f"Trying URL: {url} | Path: {path}")
    try:
        sio.connect(url, socketio_path=path, wait_timeout=3, transports=['polling'])
        print("Success!")
        sio.disconnect()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    # 1. Base URL + Path
    try_connect('http://localhost:8001', 'ws/socket.io')
    try_connect('http://localhost:8001', '/ws/socket.io')
    
    # 2. Mounted URL + Default Path
    try_connect('http://localhost:8001/ws', 'socket.io')
    try_connect('http://localhost:8001/ws', '/socket.io')

    # 3. Direct
    try_connect('http://localhost:8001', 'socket.io')
