This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

Component Usage Rules
Toast (Notification):

When to Use: For quick, non-blocking feedback. Use it to inform the user that an action has already succeeded or failed (e.g., "Event saved!", "Login failed," "Copied to clipboard").

Placement: Top-right corner, as you requested.

Behavior: Should not interrupt the user's workflow and should auto-dismiss.

Modal (Pop-up):

When to Use: For blocking actions that require user confirmation or input before proceeding. Use it for "Are you sure?" confirmations (e.g., "Delete event?") or for forms that need to be completed (e.g., "Create Booking").

Placement: Centered on the screen with a dark backdrop.

Behavior: Interrupts the workflow. The user must interact with it (confirm or cancel) to continue.

Loading Backdrop (New):

When to Use: For blocking the UI while a critical, full-page action is in progress (e.g., submitting the login/register form). This prevents the user from clicking anything else.

Placement: Full-screen overlay, centered spinner.

Behavior: Blocks all UI interaction until the API call completes.


3. Page Structure: Landing Page vs. Dashboard
You are correct again. We will use Next.js's "Route Groups" to implement this logic perfectly.

(public) pages: This group will contain our "Landing Pages."

Files: /app/(public)/layout.tsx, /app/(public)/page.tsx (our homepage), /app/(public)/login/page.tsx, /app/(public)/register/page.tsx

Layout: Will have the marketing header and footer.

Audience: Logged-out users.

(app) pages: This group will contain our "Dashboard" and core product.

Files: /app/(app)/layout.tsx, /app/(app)/dashboard/page.tsx, /app/(app)/experts/page.tsx

Layout: Will have the sidebar and user navbar.

Audience: Logged-in users only (we will add logic to protect this route).

This structure keeps our public landing pages and private app completely separate.
