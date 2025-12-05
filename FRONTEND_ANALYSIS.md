# Frontend Project Analysis & Recommendations

## 1. Executive Summary
The ATAS Platform frontend is built with **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS**. It integrates with a **FastAPI** backend via a centralized `api.ts` service using **Axios**. The project follows a clear directory structure with route groups for public, app, and admin areas.

## 2. Backend Integration Analysis
- **API Client**: `frontend/services/api.ts` is the central hub for all API calls. It uses an Axios instance with interceptors to inject the JWT `atas_token`.
- **Authentication**: Implements OAuth2PasswordBearer flow. Tokens are stored in `localStorage`.
- **Endpoints**: The frontend covers all major backend modules: Auth, Profiles, Events, Attendance, and Admin.
- **Data Fetching**: Uses `swr` (implied by `package.json` and hooks) for efficient data fetching and caching.
- **Types**: `api.types.ts` maintains TypeScript definitions, ensuring type safety across the boundary.

**Integration Health**: Strong. The separation of API logic from UI components is good.

## 3. Frontend Structure Review
- **Architecture**: Next.js App Router with Route Groups:
  - `(public)`: Auth flows (Login, Register, Verify).
  - `(app)`: Main user dashboard, events, profile.
  - `(admin)`: Admin-specific pages.
- **Components**:
  - Feature-based: `admin`, `auth`, `event`, `onboarding`.
  - Shared UI: `components/ui` contains reusable atoms like `Card`, `FormField`, `AppNavbar`.
- **Styling**: Tailwind CSS with a custom theme:
  - **Primary**: Purple (`#8b5cf6`)
  - **Brand**: Yellow (`#FACC15`), Black (`#18181B`), Cream (`#FFFBEB`)
  - **Fonts**: Inter (Sans), Monospace.
- **State Management**:
  - Local state (`useState`) for forms/UI.
  - Server state via `swr` (likely wrapped in `useUser` and `useEvent`).
  - No global client state store (Redux/Zustand), which is appropriate for this architecture.

## 4. UI/UX Analysis
- **Design System**: Consistent use of the defined color palette.
- **Feedback**: `react-hot-toast` provides consistent user feedback (success/error messages).
- **Loading States**: `LoadingBackdrop` is available.
- **Navigation**: Separate navbars for public vs. app areas.

## 5. Recommendations

### UI/UX Enhancements (No Backend Changes Required)
1.  **Skeleton Loading**: Replace `LoadingBackdrop` (which blocks the whole screen) with Skeleton loaders for individual cards/tables to improve perceived performance.
2.  **Empty States**: Create a reusable `EmptyState` component for lists (e.g., "No events found") with a call-to-action.
3.  **Form UX**:
    - Use `react-hook-form` (if not already) for better validation and performance.
    - Add "Password Strength" indicators on registration.
4.  **Responsive Tables**: Ensure `DataTable.tsx` handles mobile views gracefully (e.g., horizontal scroll or card view on mobile).
5.  **Transitions**: Utilize `framer-motion` (or Tailwind `transition-*` classes) for smoother page transitions and modal appearances.

### Code Quality & Maintenance
1.  **Service Refactoring**: `api.ts` is becoming a monolith (~500 lines). Split it into domain-specific services:
    - `services/auth.service.ts`
    - `services/event.service.ts`
    - `services/profile.service.ts`
2.  **Hook Optimization**: `useAuthGuard` calls `getMe` even if `useUser` might have already fetched it. Ensure `useUser` uses `swr` effectively to avoid double-fetching.
3.  **Type Safety**: Ensure strict null checks are enabled and `api.types.ts` is kept in sync with Pydantic models.

### Performance
1.  **Image Optimization**: Ensure all `img` tags are replaced with Next.js `<Image />` component for automatic optimization.
2.  **Bundle Size**: Import specific lodash functions (e.g., `import debounce from 'lodash/debounce'`) instead of the whole library if not tree-shaken.

## 6. Potential Risks
- **Auth Token Handling**: Storing tokens in `localStorage` is vulnerable to XSS. Consider moving to `httpOnly` cookies if security requirements increase.
- **API Versioning**: Hardcoded `/api/v1` in `api.ts`. Ensure this is configurable via env vars for future versioning.

## 7. Next Steps
1.  **Refactor `api.ts`**: Split into modular services.
2.  **Implement Skeleton Loaders**: Improve loading UX.
3.  **Audit Mobile Responsiveness**: Check all main flows on mobile view.
