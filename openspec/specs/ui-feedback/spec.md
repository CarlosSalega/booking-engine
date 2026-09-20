# UI Feedback Specification

## Purpose

Cross-cutting feedback and status-signalling baseline for the booking engine. Defines how transactional feedback surfaces (toasts, status badges, activity indicators, floating CTAs) consume design tokens, communicate state, and present loading states. All presentation-layer components that render status, feedback, or loading MUST conform to these rules.

## Requirements

### Requirement: Semantic Token Consumption for Feedback Surfaces

All feedback and status surfaces (toasts, status badges, activity feeds, floating CTAs) MUST consume semantic design tokens (`--status-*`, `--success`, `--warning`, `--info`, `--destructive`, etc.) rather than raw Tailwind palette classes (e.g. `bg-red-500`, `text-green-600`). Raw palette classes SHALL NOT appear in status/feedback rendering code.

This applies to:
- Toast styling in the root layout (`src/app/layout.tsx` Toaster)
- Status badges across dashboard, payments, calendar, and landing surfaces
- Activity/recent-activity indicators
- Floating CTA buttons (e.g. WhatsApp)

#### Scenario: Toaster uses valid token references

- GIVEN the root layout renders the Toaster component
- WHEN the Toaster's inline `style` prop is inspected
- THEN all CSS custom property references use `var(--token-name)` directly (e.g. `var(--card)`, `var(--foreground)`, `var(--border)`)
- AND no `hsl(var(--...))` wrapping is present in any style declaration

#### Scenario: Status badges consume semantic tokens

- GIVEN a status badge component renders a booking or payment status
- WHEN the badge's className is inspected
- THEN it references a semantic token class (e.g. `--status-pending`, `--status-confirmed`) or a semantic color token
- AND no raw Tailwind palette class (e.g. `bg-amber-500`, `text-emerald-600`) is used for status coloring

#### Scenario: No hsl(var(...)) remains in source

- GIVEN the entire `src/` directory
- WHEN searched for the pattern `hsl(var(--`
- THEN zero matches are found in production source files

### Requirement: Non-Color State Communication

State MUST NOT be communicated by color alone. Every status indicator, progress step, or feedback signal MUST provide at least one additional non-color channel: text label, icon with `aria-label`, `aria-current`, or structural position.

This ensures accessibility for users with color vision deficiencies (WCAG 1.4.1).

#### Scenario: Progress indicator has text label

- GIVEN a multi-step progress indicator (e.g. booking wizard)
- WHEN the indicator renders the current step
- THEN the current step is identifiable by text content (step number + label) and/or `aria-current="step"`
- AND color is not the sole differentiator between current, completed, and pending steps

#### Scenario: Status badge has text content

- GIVEN any status badge renders
- WHEN inspected programmatically
- THEN the badge contains visible text (e.g. "Pendiente", "Confirmado") in addition to its color coding

### Requirement: Skeleton Loading for Content Surfaces

Content loading states MUST use `Skeleton` components (shimmer placeholders) rather than spinners for content-area loading. Spinners MAY be used for button-level async actions (e.g. form submit), but page/section content loading SHALL use `Skeleton`.

This applies to:
- Wizard step content loading (e.g. patient search results)
- Dashboard section loading states
- Any section that loads data asynchronously into a content area

#### Scenario: Wizard patient search uses skeleton

- GIVEN the booking wizard step 4 is loading patient search results
- WHEN the loading state is active
- THEN a `Skeleton` component is rendered (not a spinner)

#### Scenario: Dashboard loading sections use skeleton

- GIVEN a dashboard section is loading data
- WHEN the Suspense/loading fallback renders
- THEN `Skeleton` components are shown matching the content layout

### Requirement: Dark Mode Token Safety

All feedback and status surfaces MUST render correctly in both light and dark themes. Since design tokens are authored in `oklch()`, consuming components MUST reference tokens via `var(--token-name)` without additional color-function wrapping (no `hsl()`, `rgb()`, or `oklch()` wrapping around `var()` references).

#### Scenario: Toast renders correctly in dark mode

- GIVEN the application is in dark mode
- WHEN a toast notification appears
- THEN the toast background, text, and border colors are visible and consistent with the theme

#### Scenario: Status badge renders correctly in both themes

- GIVEN a status badge is rendered
- WHEN toggling between light and dark mode
- THEN the badge remains readable with appropriate contrast in both themes
