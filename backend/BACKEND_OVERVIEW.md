# Backend Overview

## Runtime & Services
- Backend runs on port `8000` (watch mode). Frontend is on `3000`. Ports must not change.
- API prefixes:
  - Auth: `/api/v1/auth`
  - Events: `/api/v1`
  - Profiles: `/api/v1/profiles`
  - Admin: `/api/v1/admin`
  - Notifications: `/api/v1`

## Authentication
- Login with email/password via `/api/v1/auth/login` using `OAuth2PasswordBearer`.
- Access tokens carry `sub=user_id` and are verified by `get_current_user`.
- References:
  - `app/routers/auth_router.py:26-47`
  - `app/dependencies.py:13-40`

## Database & Test Isolation
- Production DB uses `DATABASE_URL` from env (`app/database/database.py:7-13`).
- Test DB isolation:
  - If `TESTING=1`, SQLite test engine and session are used (`app/database/database.py:25-31`, `:36-44`).
  - Pytest-only override in `app/main.py:45-60` creates a SQLite session and overrides `get_db`.
  - Autouse fixture resets overrides for each test (`app/test/conftest.py:29-32`).
- Soft-deletes: queries filter `deleted_at IS NULL` to exclude deleted records (`app/routers/event_router.py:132`, `:246`).

## Profiles
- Profile auto-created at registration (`app/services/user_service.py:22-30`).
- Owner GET auto-creates a blank profile if missing (`app/routers/profile_router.py:190-202`).
- Discover and count endpoints filter public profiles and support name/tags/skills (`app/routers/profile_router.py:26-118`).

## Roles & Onboarding
- Onboarding assigns pending roles and notifies admins:
  - `expert_pending` and `sponsor_pending` (`app/routers/profile_router.py:152-171`).
- Admin endpoints to approve/reject pending roles:
  - Approve: `POST /api/v1/admin/users/{user_id}/roles/approve` (`app/routers/admin_router.py:78-104`).
  - Reject: `POST /api/v1/admin/users/{user_id}/roles/reject` (`app/routers/admin_router.py:106-126`).
 - Admin user management:
   - List: `GET /api/v1/users` (filters by `email`, `status`, `is_verified`, `name`).
   - Count: `GET /api/v1/users/search/count`.
   - Assign/Remove Role: `POST|DELETE /api/v1/users/{user_id}/roles/{role_name}`.
   - Verify/Revoke Expert: `POST|DELETE /api/v1/users/{user_id}/expert/verify`.
   - Suspend/Activate: `POST /api/v1/users/{user_id}/suspend|activate`.

## Events: Core Flows
- Create, publish/unpublish, registration open/close, end, delete.
- Joining:
  - Requires `published` and `registration_status=opened`.
  - Idempotent: repeat joins return existing participation (`app/routers/event_router.py:640-656`).
  - Respects capacity and `auto_accept_registration` (`app/routers/event_router.py:657-680`).
- Attendance:
  - QR attendance requires login; allowed until event end time (`app/routers/event_router.py:1745-1771`).
- Delete event:
  - Organizer or admin can soft-delete (`app/routers/event_router.py:916-926`).
 - Proposal comments:
   - Email notification is sent to proposal owner; duplicate in-app notifications removed (`app/routers/event_router.py:1435-1443`).

## Proposals & Comments Visibility
- Listing is restricted to organizer, committee, speaker, sponsor, or admin:
  - Proposals list: `app/routers/event_router.py:1202-1238`.
  - Proposal comments list: `app/routers/event_router.py:1289-1342`.
- Create/update/delete still require appropriate roles.

## Audit Logging
- Key event actions are logged (publish/unpublish/delete) with `log_admin_action`.
- Admin can list and count audit logs:
  - List: `app/routers/admin_router.py:18-31`
  - Count: `app/routers/admin_router.py:67-92`

## Counts & Filtering
- Standard event count endpoint with flexible filters and visibility control (`app/routers/event_router.py:121-160`).
- Use `include_all_visibility=true` to include private events when needed; defaults to public-only.
 - Users count supports the same filters as listing.

## Conventions
- Python and DB names: `snake_case`.
- JSON API keys: `snake_case`.
- Avoid changing ports; prefer editing existing files over creating new ones.

## Notes
- Some tests insert users directly; owner GET auto-create and backfill handle missing profiles.
- Replace `datetime.utcnow()` with `datetime.now(timezone.utc)` over time to remove deprecation warnings.
 - Notifications broadcast is admin-only and supports role/user targeting: `POST /api/v1/admin/notifications/broadcast`.
