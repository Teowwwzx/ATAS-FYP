# Implementation Plan - UI Enhancements & Fixes

## Problem
The user has reported UI/UX issues and we are currently debugging a build failure.
1. **User Request**: "The cover should be able to click to show up a modal preview." (Referring to Dashboard Hero Card).
2. **User Request**: "The event title should only in single line don't wrap... Should reduce the size based on screen size."
3. **Build Error**: The build process failed with an ambiguous error in the last attempt.

## Proposed Changes

### 1. Dashboard Hero Card (`DashboardHeroCard.tsx`)
-   **Interaction**: Add an `onClick` handler to the hero image (or the whole card, but image specifically requested) to trigger the `onPreview` callback.
-   **Cursor**: Change cursor to `pointer` on the image hover.
-   **Title Typography**:
    -   Force single line: `whitespace-nowrap overflow-hidden text-ellipsis`.
    -   Responsive Sizing: Adjust font sizes (e.g., `text-3xl md:text-5xl lg:text-6xl`) to maximize usage of space before truncation.

### 2. Event Details Page (`events/[id]/page.tsx`)
-   **Title Typography**: Apply the same single-line truncation and responsive font sizing rules.
-   **Layout**: Ensure the layout is robust and matches the approved "Hero Card" style.

### 3. Event Preview Modal (`EventPreviewModal.tsx`)
-   **Title Typography**: Apply consistent single-line styling.

### 4. Discover Event Card (`EventCard.tsx`)
-   **Title Typography**: Apply consistent single-line styling.

### 5. Build Fixes
-   Investigate and resolve the current build error (suspected to be in a Table component based on "categories.length" snippet).

## Verification Plan
1.  **Manual Check**: Verify clicking the dashboard cover opens the preview.
2.  **Visual Check**: Test long titles to ensure they truncate with `...` and do not wrap.
3.  **Build Check**: Run `npm run build` to ensure the application compiles successfully.
