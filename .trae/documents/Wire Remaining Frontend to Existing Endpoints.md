# Unwired Endpoints and Plan

## Participants
- Respond to invitation: PUT /events/{id}/participants/me/status
  - UI: Add Accept/Reject buttons in event page when current user's participant.status=pending
  - API: Use existing `respond_event_invitation` via `updateEventParticipantStatusMe` (to add)
- Organizer accept/reject: PUT /events/{id}/participants/{pid}/status
  - UI: Add status controls next to pending participants
  - API: `updateEventParticipantStatus` (to add)

## Attendance
- QR generation: POST /events/{id}/attendance/qr and GET /events/{id}/attendance/qr.png
  - UI: Organizer/committee section to generate token and show PNG; copy token
  - API: Already present (`generateAttendanceQR`, `getAttendanceQRPNG`)
- Scan: POST /events/attendance/scan
  - UI: Minimal scan page accepting token and optional email; shows success/failure
  - API: Already present (`scanAttendance`)
- Stats: GET /events/{id}/attendance/stats
  - UI: Organizer/committee attendance stats card
  - API: Add `getEventAttendanceStats`

## Reminders
- Create reminder: POST /events/{id}/reminders (wired)
- Run due reminders: POST /events/reminders/run
  - UI: Button in dashboard to run due reminders and show count
  - API: Add `runMyDueReminders(limit?)`

## Categories
- Event categories: GET/POST /events/{id}/categories (API exists)
  - UI: Attach/remove categories panel on event page (attach only; remove via re-attach validation)
- Global categories: GET/POST /categories
  - UI: Admin-only simple list/create page (layout stub if admin detection isn’t ready)
  - API: Add `listCategories`, `createCategory`

## Proposals
- List comments & add comment (API wired)
  - UI: Display proposal list and comments in event page; add comment form

## History
- My event history: GET /events/me/history
  - UI: Add History tab on dashboard to show past attended/organized/speaker/sponsor
  - API: `getMyEventHistory` exists

## Reviews (Backend present)
- Create/list reviews by user
  - UI: Add review section on expert profile; submit review from event page
  - API: Add `createReview`, `getReviewsByUser`

## Scheduler (manual run)
- POST /events/scheduler/run
  - UI: Button for organizer to trigger transitions (dev tool)
  - API: Add `runEventScheduler`

# Deliverables
- New API methods and UI sections as above
- Non-disruptive frontend changes only; no backend edits

# Task Completion Report
- What was completed:
  - Surveyed backend endpoints and mapped unwired frontend areas
  - Prepared a concrete wiring plan covering participants, attendance, reminders, categories, proposals, history, reviews, scheduler
- Recommendations:
  - Implement UI pieces incrementally; add role badges and disable invalid actions
- Next steps:
  - Approve the plan; then add API helpers and UI panels to complete wiring