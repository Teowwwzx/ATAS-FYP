## Overview
- Enforce dashboard access only for authenticated users with allowed roles.
- Use existing JWT-based auth and profile endpoint for login check; add a minimal roles endpoint.
- Apply client-side route guard for `/main/dashboard` and related pages.

## Backend Additions
1. Add `GET /api/v1/users/me` to return current user's id, email and role names.
   - File: `backend/app/routers/user_router.py`
   - Dependency: `get_current_user`
   - Response schema: `UserMeResponse` in `backend/app/schemas/user_schema.py` with fields: `id`, `email`, `roles: list[str]`.
   - Implementation: read `user.roles` relationship and map to `role.name`.

2. Keep existing `GET /api/v1/profiles/me` for login verification.
   - No change needed; used by frontend to validate session.

## Frontend Guard
1. Types & API
   - Add `UserMeResponse` to `frontend/services/api.types.ts`.
   - Add `getMe()` in `frontend/services/api.ts` calling `/users/me`.

2. Create `useAuthGuard(requiredRoles?: string[])` hook (client-side).
   - Checks token via interceptor and fetches `/profiles/me`.
   - If unauthenticated → redirect to `/login`.
   - Fetch `/users/me` → if `requiredRoles` provided and none match user roles → redirect to `/main` with toast.
   - Expose `{me, roles, loading}`.

3. Apply guard in pages:
   - `frontend/app/main/dashboard/page.tsx`: call `useAuthGuard(['student','sponsor'])` (adjustable per your policy). While inside a specific event, further restrict checklist/proposal write actions to organizer or committee by verifying `event.organizer_id === me.user_id` or my participant role via `/events/{id}/participants`.
   - Optional: also guard `/main/events/create` for `student` role if you want only students to create events.

## UI Behavior
- Not logged-in: redirect to `/login`.
- Logged-in but role not allowed: redirect to `/main` and show a message, e.g., “Dashboard is restricted. Your role: X. Required: sponsor/organizer.”
- Logged-in with allowed role:
  - Organizer dashboard loads events from `/events/mine`, shows overview, checklist, and proposals (already implemented components).
  - Action buttons (create checklist/proposal, toggle/delete) enabled only if organizer or committee; otherwise disabled.

## Tests
- Backend: add a test that assigns a role during onboarding and verifies `/users/me` returns that role.
- Frontend: light manual validation (navigate to `/main/dashboard` with and without token; with roles `student`/`sponsor`; ensure redirects occur).

## Notes
- Roles used are application roles (`roles.name` such as `student` or `sponsor`). Organizer is an event participant role, enforced per-event for write operations.
- No port changes; frontend on `3000`, backend on `8000`.
- JSON keys remain snake_case in backend responses.

## Next Actions (on approval)
1. Implement `UserMeResponse` schema and `/users/me` endpoint.
2. Add `getMe()` and `useAuthGuard()` in frontend.
3. Integrate guard into `/main/dashboard` and optionally `/main/events/create`.
4. Add backend test for `/users/me` and manually validate frontend redirects.