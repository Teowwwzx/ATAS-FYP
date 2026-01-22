# Testing (Comm Backend)

## 0) Prereqs

- Postgres + Redis must be running (via your `docker-compose.yml`).
- API runs on `http://localhost:8001` and Socket.IO is mounted at `/ws`.

## 1) Schema + Seed users

Run this once to create tables (dev-only) and seed:

```bash
python -m app.scripts.seed
```

Users created (password `123123`):

- `admin@gmail.com`
- `moderator@gmail.com`
- `student@gmail.com`

## 2) API smoke

Start API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Check:

```bash
curl http://localhost:8001/health
```

## 3) Celery worker smoke

Start worker:

```bash
celery -A app.worker:celery_app worker -l info
```

Run a task from another terminal:

```bash
python -m app.scripts.celery_smoke
```

Expect output:

```json
"pong"
```

## 4) WebSocket + REST end-to-end smoke

With API running (and seed done), run:

```bash
python -m app.scripts.ws_e2e
```

Expect:

```json
{"new_comment": true, "notification": true}
```

