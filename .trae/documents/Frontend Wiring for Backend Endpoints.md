# Wire Frontend to All Backend Endpoints

## Scope
- Implement comprehensive client-side integration for all existing backend APIs under `http://127.0.0.1:8000/api/v1` using Axios and SWR.
- Bind pages and components in the Next.js app to these APIs with consistent error handling, JWT auth, and route guards.

## Current Status (Frontend)
- API client exists with many endpoints implemented in `frontend/services/api.ts` (auth, profiles, events, proposals, checklist, attendance QR, reminders create, users/me).
- Missing or partial: categories (list/attach), participant role update/remove, event end, attendance stats, run reminders, reviews (create/list), follows, notification fetch.
- Hooks: `useUser`, `useAuthGuard` done; `useEvent` implemented to fetch events and actions; some main pages are placeholders.

## Implementation Plan

### API Layer Completion
- Add functions in `frontend/services/api.ts` for missing endpoints:
  - Categories: `getEventCategories(eventId)`, `attachEventCategories(eventId, body)`
  - Participants: `updateParticipantRole(eventId, participantId, body)`, `removeParticipant(eventId, participantId)`
  - Event lifecycle: `endEvent(eventId)`
  - Attendance: `getAttendanceStats(eventId)`
  - Reminders: `runMyDueReminders(limit?)`
  - Reviews: `createReview(body)`, `getReviewsByUser(userId)`
  - Follows: list and follow/unfollow if present in backend router
  - Notifications: list recent notifications if endpoint exists
- Ensure all functions use camelCase locally while sending snake_case JSON keys as defined by backend schemas.

### Hooks
- Create SWR hooks for common domains:
  - `useMyProfile()` and `useProfile(userId)`
  - `useEventParticipants(eventId)`
  - `useEventCategories(eventId)`
  - `useEventProposals(eventId)` & comments
  - `useEventChecklist(eventId)`
  - `useAttendanceStats(eventId)`
  - `useMyEvents()` (already covered by `useEvent` helpers)
  - `useUserReviews(userId)`

### Pages & Components Wiring
- Auth & Onboarding
  - Login/Register pages already call `login`, `register`, `verifyEmail`; keep JWT in localStorage and use interceptor.
  - Onboarding page uses `completeOnboarding`; add success path refresh via `useUser()`.
- Dashboard (`frontend/app/main/page.tsx`)
  - Display `useMyEvents()` list with status/role.
  - Surface reminders UI (create, run due) and link to upcoming events.
  - Show notifications (if API exists) and quick actions for organizers.
- Events
  - Create page: bind form to `createEvent`; validate inputs; toast feedback.
  - Details page:
    - Fetch `getEventById`; show participants (`useEventParticipants`).
    - Actions: `joinPublicEvent`, `leaveEvent`, `bulkInviteEventParticipants`.
    - Organizer-only: `updateParticipantRole`, `removeParticipant`, `attachEventCategories`, `generateAttendanceQR`, `getAttendanceQRPNG`, `getAttendanceStats`, `endEvent`.
    - Proposals: list/create, comment list/create; show file upload to Cloudinary via backend if needed.
    - Checklist: list/create/update/delete; sortable order and completion toggle.
- Profiles
  - My profile page: bind `getMyProfile`, `updateProfile`, `updateAvatar`, `updateCoverPicture`.
  - Public profile page: `findProfiles` and `GET /profiles/{user_id}`.
- Reviews
  - Add review form for organizers/participants; submit via `createReview`; display `getReviewsByUser` on expert profiles.

### UX & Error Handling
- Use `getApiErrorMessage` and `toastError` for consistent errors.
- Loading states via `LoadingBackdrop` for critical actions (auth/event submit); spinners for lists.
- Role-based guard with `useAuthGuard(requiredRoles)` for organizer/committee features.

### Security & Consistency
- Keep ports fixed (`3000` frontend, `8000` backend).
- Store JWT in localStorage; expiration check integrated; add Logout to navbar using exported `logout`.
- Maintain camelCase in JS code and snake_case in API payloads.

### Verification
- Manual run through flows on dev server:
  - Auth → Onboarding → Dashboard → Event create → Invite participants → Join/Leave → Proposals/comments → Checklist → Attendance QR/scan → End event → Reviews.
- Add lightweight page-level checks (SWR data presence) and console assertions during dev.

## Deliverables
- Completed API functions for all backend endpoints.
- SWR hooks for core domains.
- Wired pages/components with role-aware actions.
- Consistent error/loading states.

## Risks & Mitigations
- Some backend endpoints require organizer/committee roles; ensure guard and helpful messaging.
- Email/Cloudinary features need valid env keys; degrade gracefully in dev.

## Task Completion Report
- What was completed:
  - Produced a detailed frontend wiring plan covering API functions, hooks, pages, and verification
- Recommendations:
  - Implement missing API methods first, then wire pages incrementally; use SWR for caching and optimistic UI where safe
- Next steps:
  - Approve the plan and proceed to implement API additions, hooks, and page bindings in the repository