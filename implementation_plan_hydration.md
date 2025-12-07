---
description: Fix hydration error and investigate profile loading state
---
# Implementation Plan - Fix Hydration and Profile Loading

The user is experiencing a "stuck at loading state" issue on the Profile page, accompanied by a React hydration mismatch error caused by a browser extension injecting attributes (`data-jetski-tab-id`) into the `<html>` tag.

## User Review Required

> [!IMPORTANT]
> I will be adding `suppressHydrationWarning` to the `<html>` tag to suppress the hydration error caused by the browser extension.

## Proposed Changes

### Frontend

#### [NEW] `frontend/app/layout.tsx`

- Add `suppressHydrationWarning` to the `<html>` tag in `RootLayout`.
- **Reason**: To silence the hydration mismatch error caused by external attributes (like those from browser extensions).

#### [NEW] Verification

- I will attempt to log in as a seeded user (`student1@mail.com` / `123123123`) using the browser subagent to verify that the Profile page loads correctly after the fix and doesn't get stuck.

## Verification Plan

### Automated Tests
- Run `npm run dev` (already running).
- Use `browser_subagent` to:
    1.  Navigate to `/login`.
    2.  Login with `student1@mail.com` / `123123123`.
    3.  Navigate to `/profile`.
    4.  Verify the page content loads and doesn't stay on the spinner.

### Manual Verification
- User to verify if the "stuck at loading" issue persists in their browser.
