# Locations and Checklist

## Where to Edit Event
- Backend endpoint: `PUT /events/{event_id}` in backend/app/routers/event_router.py:1682
- Schema: `EventUpdate` in backend/app/schemas/event_schema.py:33
- Frontend UI: Event details edit panel in frontend/app/main/events/[id]/page.tsx (Edit Event section)
- Frontend API: `updateEvent(eventId, data)` in frontend/services/api.ts:183

## Where to Delete Event (To Implement)
- Backend: Add `DELETE /events/{event_id}` in backend/app/routers/event_router.py (organizer-only; soft delete or hard delete)
- Frontend API: Add `deleteEvent(eventId)` in frontend/services/api.ts
- Frontend UI: Add “Delete Event” button in frontend/app/main/events/[id]/page.tsx for organizers; confirm dialog + toast; redirect to `/dashboard` after delete

## Where to Find Profiles (General)
- Frontend page: Public profiles list at frontend/app/main/profile/page.tsx
- Frontend API: `getPublicProfiles()` at frontend/services/api.ts:282 and `findProfiles({ name })` at frontend/services/api.ts:277
- Response type includes tags: `ProfileResponse.tags` at frontend/services/api.types.ts:65

## Where to Find Speakers/Students in Event Dashboard
- Event page participants search panel at frontend/app/main/events/[id]/page.tsx:
  - Uses `findProfiles({ name })` with tag filter and pagination
  - Invite role selector allows organizer to invite as `speaker` or `committee`
- Enriched participants list uses `getProfileByUserId(userId)` at frontend/services/api.ts:192 to show names
- Future enhancement: Add a backend filter to list users by role (e.g., `/users?role=speaker|student`), then wire a dedicated “Speakers”/“Students” tab

# Checklist to Finish Tasks

1. Implement event deletion
- Add backend `DELETE /events/{event_id}` (organizer-only)
- Add `deleteEvent(eventId)` in api.ts
- Add delete button to event details page with confirmation and toast

2. Polish edit event UX
- Validate inputs client-side (end > start, required title)
- Auto-derive type when format changes unless explicitly overridden
- Show toasts on save

3. Profiles directory improvements
- Add link in navbar to “Profiles”
- Add tag chips and avatar placeholders
- Optional: add tag autocomplete

4. Speaker/Student search in event
- Add quick filters: “Speakers” and “Students” tabs once backend provides role-filtered endpoints
- Keep current name+tag search as fallback

5. Testing
- Add backend tests for `DELETE /events/{event_id}`
- Smoke-test organizer: edit/delete; invite speaker/committee; proposal creation; image uploads
- Verify committee dashboard checklists

# Task Completion Report
- What was completed:
  - Identified edit endpoints and UI, provided precise file locations
  - Detailed where to find profiles and speaker search in event page
  - Prepared an actionable checklist for deletion and remaining polish
- Recommendations:
  - Implement delete endpoint and role-based user listing to streamline speaker/student filtering
- Next steps:
  - Approve checklist; proceed to implement delete API/UI and navbar link to profiles