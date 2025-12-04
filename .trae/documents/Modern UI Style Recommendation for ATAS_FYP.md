## Design Goals
- Clean, data-first dashboard feel optimized for productivity
- Accessible by default, responsive from mobile → desktop
- Subtle depth (borders, elevation) over heavy glassmorphism or skeuomorphism
- Seamless light/dark parity driven by CSS variables and Tailwind tokens

## Recommended Style
- Color: Neutral surfaces with a single strong accent from `primary` palette; success/warning/error as desaturated variants
- Typography: Modern geometric sans for UI; monospaced for code/data; consistent type scale
- Spacing: 8pt grid system; generous whitespace for high-signal content; compact density for tabular views
- Radius & Elevation: `md` radius for cards, `sm` for inputs; soft shadows for focus surfaces; hairline borders for separation
- Motion: Micro-interactions (150–250ms), springy but subtle; reduced motion respected

## Align With Current Stack
- Framework: Next.js (React)
- Styling: Tailwind CSS v4 with `@tailwindcss/forms`, global tokens in `app/globals.css`
- UI Primitives: Radix UI (`@radix-ui/react-*`) for dialogs, overlays, and accessible components
- Theme Tokens: Use `@theme inline` and Tailwind theme extension for colors, typography, spacing

## Theme & Tokens
- Colors: Consolidate semantic tokens (`--background`, `--foreground`, `--primary`, `--success`, `--warning`, `--error`) in `app/globals.css` and mirror in `tailwind.config.ts`
- Typography: Define `--font-sans`, `--font-mono` via Next fonts; map to Tailwind `fontFamily`
- Spacing: Extend Tailwind spacing scale to align with 8pt grid; add container widths for dashboard layouts
- States: Standardize focus rings (`ring-2 ring-primary-500/60`), hover/active translucency, disabled opacity

## Component Patterns
- Navigation: Sticky top bar with clear hierarchy; side navigation collapsible; breadcrumbs when deep
- Cards: Content blocks with `border`, `bg-muted`, `shadow-sm`; header actions right-aligned
- Tables: Sticky header, zebra rows, compact density; inline filters; empty states and skeleton loaders
- Forms: Minimal borders (`@tailwindcss/forms`), clear labels/help text, error messages aligned
- Overlays: Radix Dialog/Sheet with dim backdrop, escape to close; keyboard navigation consistent

## Dark Mode
- Use class-based or media-driven dark mode; drive `--background`/`--foreground` at `:root`
- Maintain contrast AA/AAA; avoid pure blacks; soften borders with opacities

## Accessibility
- Enforce keyboard navigation patterns; visible focus styles
- Semantic HTML with ARIA only as needed; Radix primitives for complex components
- Color contrast checks on all semantic statuses

## Implementation Approach (No Code Yet)
- Inventory current tokens in `app/globals.css` and `tailwind.config.ts`
- Propose a consolidated token set and Tailwind theme extension
- Create non-invasive example components (Card, Table, Form) using existing files
- Add dark mode parity and motion guidelines
- Validate across breakpoints and with reduced motion

## Deliverables Upon Approval
- Updated theme tokens (no breaking changes)
- Example components demonstrating the style in existing pages
- Usage guidelines for spacing, typography, colors, and motion

## References
- Existing files: `frontend/app/globals.css`, `frontend/tailwind.config.ts`, `frontend/postcss.config.mjs`
- Libraries: Tailwind v4, `@tailwindcss/forms`, Radix UI, `react-hot-toast`
