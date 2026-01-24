# Testing (Comm Backend)

## 0) Prereqs

- Postgres + Redis must be running (via your `docker-compose.yml`).
- API runs on `http://localhost:8001` and Socket.IO is mounted at `/ws`.

## 1) Schema + Seed users

Run migrations, then seed:

```bash
python -m app.scripts.migrate
python -m app.scripts.seed
```

If you don't want to use migrations yet, you can still create tables (dev-only) and seed:

```bash
python -m app.scripts.seed
```

If you're running via Docker and want tables created automatically on `comm_api` startup, set:

```bash
AUTO_CREATE_TABLES=1
```

Production-style note: do **not** run `create_all()` on app startup. Run migrations as a separate deploy step (K8s Job/one-off task) or gate it behind an explicit flag like `RUN_MIGRATIONS=1`.

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

## 5) Check notification inbox (DB-backed)

After running the e2e script, fetch notifications via REST:

```bash
curl -X POST http://localhost:8001/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@gmail.com\",\"password\":\"123123\"}"
```

Copy `access_token`, then:

```bash
curl http://localhost:8001/v1/notifications -H "Authorization: Bearer <access_token>"
```

