# Dashboard Shell Specification

## Purpose

Dashboard chrome behavior for the booking engine. Defines the site header's breadcrumb contract and establishes the dashboard-level integration point for the status/loading conventions provided by the `ui-feedback` capability. The dashboard shell is the structural wrapper that all authenticated dashboard routes share.

## Requirements

### Requirement: Route-Derived Breadcrumbs

The `SiteHeader` component MUST render breadcrumbs that reflect the current route, not a static label. The breadcrumb trail MUST be derived from the active pathname and a segment-to-label mapping.

- The breadcrumb MUST update when the route changes.
- Each segment in the path MUST map to a human-readable label in Spanish (es-AR).
- The current page segment MUST be rendered as plain text (not a link).
- Parent segments MUST be rendered as links to their respective routes.
- If a segment has no mapping in the label dictionary, the breadcrumb MAY fall back to the raw segment value or omit that level.

#### Scenario: Dashboard home shows minimal breadcrumb

- GIVEN the user is at `/dashboard`
- WHEN the SiteHeader renders
- THEN the breadcrumb shows "Dashboard" as the current (non-linked) item

#### Scenario: Bookings list shows two-level breadcrumb

- GIVEN the user is at `/dashboard/bookings`
- WHEN the SiteHeader renders
- THEN the breadcrumb shows: "Dashboard" (link) → "Turnos" (current, non-linked)

#### Scenario: Booking detail shows three-level breadcrumb

- GIVEN the user is at `/dashboard/bookings/abc-123`
- WHEN the SiteHeader renders
- THEN the breadcrumb shows: "Dashboard" (link) → "Turnos" (link) → current item (non-linked)

#### Scenario: Calendar route breadcrumb

- GIVEN the user is at `/dashboard/calendar`
- WHEN the SiteHeader renders
- THEN the breadcrumb shows: "Dashboard" (link) → "Calendario" (current, non-linked)

#### Scenario: Unknown segment fallback

- GIVEN the user navigates to a dashboard sub-route with no label mapping
- WHEN the SiteHeader renders
- THEN the breadcrumb degrades gracefully (shows raw segment or omits the unmapped level) without breaking the trail

### Requirement: Breadcrumb Client Isolation

The breadcrumb derivation component MUST be a client component leaf (uses `usePathname()`). The `SiteHeader` and dashboard layout MUST remain server-rendered; the breadcrumb client component is embedded as an island within the server-rendered header.

#### Scenario: Server rendering preserved

- GIVEN the dashboard layout renders
- WHEN inspecting the component tree
- THEN `SiteHeader` is a Server Component containing a client `<DashboardBreadcrumbs>` leaf
- AND the rest of the header (logo, user menu) remains server-rendered

### Requirement: Dashboard Loading Convention Integration

The dashboard shell SHALL integrate with the `ui-feedback` capability's loading conventions. Dashboard sections that load data asynchronously MUST use `Skeleton` fallbacks (not spinners) within the dashboard layout's content area.

#### Scenario: Dashboard sections use skeleton loading

- GIVEN a dashboard page with async data sections
- WHEN a section is in loading state
- THEN `Skeleton` components are displayed matching the section's layout
