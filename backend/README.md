ATAS Backend (FastAPI)

## Overview
This backend is a FastAPI service that implements the MVP for the ATAS Platform. It provides user authentication, profiles, basic event listing, email flows, and data models aligned with the Functional Requirements Document in the project root.

## Tech Stack
- `FastAPI` for the web API
- `SQLAlchemy` ORM with PostgreSQL
- `Alembic` for migrations
- `python-jose` and `passlib` for JWT and password hashing
- `resend` for transactional emails

## Project Structure
- `app/main.py` — FastAPI app and router registration
- `app/core/` — configuration, security, scheduler placeholders
- `app/database/` — engine, session, and `Base`
- `app/middleware/` — auth helpers (OAuth2/JWT)
- `app/models/` — SQLAlchemy models (users, profiles, events, reviews, follows, organizations, skills, notifications)
- `app/routers/` — API endpoints grouped by domain
- `app/schemas/` — Pydantic schemas for request/response models
- `app/services/` — domain services (user, profile, email)
- `alembic/` — migration configuration and versions

## Environment Variables
Configured via `.env` and loaded in `app/core/config.py`.
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key
- `ALGORITHM` — JWT algorithm (e.g., `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES` — token TTL
- `RESEND_API_KEY` — Resend API key for emails
- `SENDER_EMAIL` — sender address for emails
- `CLOUDINARY_API_KEY` — optional asset management
- `CLOUDINARY_API_SECRET` — optional asset management

## Getting Started
1. Create `.env` in `backend/`:
   - `DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/atas`
   - `SECRET_KEY=replace-with-strong-secret`
   - `ALGORITHM=HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES=60`
   - `RESEND_API_KEY=your-resend-key`
   - `SENDER_EMAIL=notifications@your-domain`
2. Install dependencies: `pip install -r requirements.txt`
3. Apply migrations:
   - Initialize DB and run: `alembic upgrade head`
   - Note: Ensure all models referenced in `alembic/env.py` exist; see Known Gaps.
4. Run the API: `uvicorn app.main:app --reload`
5. Visit `http://localhost:8000` and explore `http://localhost:8000/docs`.

## Core API Endpoints
Base prefix `http://localhost:8000`.
- `GET /` — health message
- `GET /api/v1/ping` — admin ping
- Auth (`/api/v1/auth`):
  - `POST /register` — register user, returns `UserResponse`
  - `POST /login` — OAuth2 form login, returns `{access_token, token_type}`
  - `GET /verify/{token}` — verify email token
- Email (`/api/v1/email`):
  - `POST /forgot-password` — send reset email
  - `POST /reset-password?token=...` — reset password
- Profiles (`/api/v1/profiles`):
  - `POST /{user_id}` — create profile
  - `GET /{user_id}` — read profile
  - `PUT /{user_id}` — update profile
- Events (`/api/v1/events`):
  - `GET /events` — list events (verified experts/events integration planned)
- Follows (`/api/v1/follows`):
  - `GET /follows` — list follow relationships

## Data Models
- `User` — email, password, verification status/token, `status`, referral fields, roles
- `Profile` — social links, visibility, relationships to `Tag` and `Skill`
- `Event` — format/type/registration/status/visibility, schedule, metadata
- `Review` — event-linked rating with reviewer/reviewee
- `Notification` — typed notifications with read state
- `Organization` — membership table with roles
- `Follow` — follower/followee
- `Skill`, `Tag` — taxonomy models

## Auth & Roles
- Passwords hashed with bcrypt (`passlib`)
- JWT access tokens via `python-jose`
- `middleware/auth_middleware.py` provides `get_current_active_user` and `require_role`

## Emails
- `services/email_service.py` integrates Resend for verification and password reset emails.
- Links target the frontend (`http://localhost:3000/...`).

## Known Gaps / TODO
- `app/routers/user_router.py` defines `router` but no endpoints; tests reference `/api/v1/users/` creation — align tests and routes.
- `alembic/env.py` imports `app.models.blocklist_model` but no such file exists; either remove import or add model; current version includes a `blocklist` table migration.
- `scheduler.py`, `notification_service.py` are placeholders.
- Event lifecycle endpoints (accept/decline/complete) and review submission APIs are not yet implemented.
- Email verification sending is printed (see `user_service.py`) — switch to `send_verification_email`.

## Testing
- Add pytest suite under `app/test/` to match current endpoints and flows.
- Ensure `TestClient` uses the correct prefixes (e.g., `/api/v1/auth/register`).

