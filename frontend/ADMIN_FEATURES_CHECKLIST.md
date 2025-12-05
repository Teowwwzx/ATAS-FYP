# Admin Features Checklist

## Email Templates
- Dedicated management page: `app/(admin)/admin/email-templates/page.tsx`
- CRUD with resilient local fallback when backend is missing
- Branded preview wrapper with ATAS styling
- Send Test modal (requires backend `/admin/email-templates/{id}/test-send`)
- Seeded defaults: `email_verification`, `forgot_password`, `moderation_notice`

## Notifications + Email Broadcast
- Admin Notifications page supports:
  - Standard in-app notification broadcast
  - Email template broadcast with variables and role targeting
  - Optional “send both” toggle
- Service method: `broadcastEmailTemplate` → `POST /admin/email-templates/broadcast`

## Admin Notification Bell
- Bell in admin header with unread badge and dropdown
- Fetches recent `broadcast_notification` audit logs
- Persists last viewed timestamp in `localStorage`

## Event Moderation
- Unpublish requires a reason; organizer notified
- Delete restricted to `super_admin`, only when not published; reason required; organizer notified
- Notifications prefer `moderation_notice` email template; fall back to in-app notification

## Auth Guard & Stability
- SWR-based `'/users/me'` caching to reduce repeated requests
- 401 redirects differentiate admin vs general login

## Implementation Notes
- Backend endpoints recommended:
  - `POST /admin/email-templates/broadcast` (render server-side, audit log entry)
  - `POST /admin/email-templates/{id}/test-send`
  - Event soft delete with `deleted_at` and role checks
- Audit logging: record moderation actions with reasons

## Next
- Server-side email rendering using the same branded wrapper
- Variable presets for common templates (verification/reset/moderation)
- “Request removal” flow for non-super admins with approval queue
