# Settings Presentation Specification

## Purpose
Admin settings page at `/dashboard/settings` replacing the placeholder. Tabbed UI (Business, Bookings, Cancellations) using shadcn/ui Tabs, `useTransition + useState` forms (project convention) with Zod 4 validation, RBAC-gated views per role, and cache-aware SWR revalidation.

## Requirements

### Requirement: Tabbed Settings Page
The system MUST render a Server Component settings page at `/dashboard/settings` with three shadcn/ui `<Tabs />`: **Business**, **Bookings**, **Cancellations**. Each tab SHALL display a form section using `useTransition + useState` (project convention). The page MUST wrap content in `<Suspense>` with a skeleton fallback during initial cache load.

#### Scenario: Admin visits settings
- GIVEN an authenticated ADMIN session
- WHEN navigating to `/dashboard/settings`
- THEN page renders with three tabs, Business tab active by default, forms editable

#### Scenario: Settings load from cache
- GIVEN settings exist for the org
- WHEN page mounts
- THEN each tab's form pre-fills with stored values (via `getSettings`)

#### Scenario: Tab navigation preserves state
- GIVEN admin edits Business name (unsaved), switches to Bookings, switches back
- THEN unsaved Business name is preserved in form state

### Requirement: Form Behavior
Each tab form MUST use `useTransition` + `useState` (project convention — same pattern as `ServiceForm`) calling the corresponding Server Action which returns `Promise<SettingsResult<T>>`. On submit, the system MUST validate via Zod 4 `updateSettingsSchema.safeParse()`. Success MUST show toast (`react-hot-toast`) and revalidate via `updateTag("settings")`. Validation errors MUST display inline per-field via `fieldErrors` state.

#### Scenario: Successful save
- GIVEN valid business config changes → WHEN submitted → THEN toast "Settings saved", cache invalidated, form shows updated values

#### Scenario: Validation error
- GIVEN email="invalid" → WHEN submitted → THEN inline error "Invalid email", no DB write, form retains entered values

#### Scenario: Server error
- GIVEN DB connection failure → WHEN submitted → THEN toast "Failed to save settings. Please try again.", form retains edits

#### Scenario: Concurrent fields preserved
- GIVEN admin updates Business name AND Booking duration in same form
- WHEN only Business name fails validation → THEN only Business name shows error, Booking duration values preserved

### Requirement: RBAC-Gated Views
The system MUST enforce per-role access: **ADMIN** SHALL see all tabs with editable fields. **SECRETARY** SHALL see all tabs with disabled fields (read-only) and a banner "View-only — contact admin to edit". **PROFESSIONAL** and **PATIENT** MUST be redirected to `/dashboard` with toast "Access denied".

#### Scenario: Secretary read-only
- GIVEN SECRETARY session → THEN all form fields disabled, "View-only" banner visible, tabs navigable

#### Scenario: Professional blocked
- GIVEN PROFESSIONAL session → THEN redirects to `/dashboard`, toast "Access denied"

#### Scenario: Unauthenticated blocked
- GIVEN no session → THEN redirects to `/login`

### Requirement: Business Tab
The Business tab MUST render fields for: name (text, req), description (textarea), address (text), timezone (select/timezone-picker), phone (tel), email (email). All localized labels in Spanish (Argentinian neutral).

#### Scenario: Timezone selection
- GIVEN Business tab open → WHEN selecting timezone → THEN dropdown lists IANA timezones, current value pre-selected

### Requirement: Bookings Tab
The Bookings tab MUST render fields for: defaultDurationMinutes (number, 5–480), minAdvanceBookingHours (number, 0–168), maxBookingsPerDay (number, 1–200), bufferMinutes (number, 0–120). Each field SHALL show helper text with the constraint range.

#### Scenario: Bookings range guard
- GIVEN input defaultDurationMinutes=0 → WHEN submitted → THEN fails validation, inline error "Must be 5–480 minutes"

### Requirement: Cancellations Tab
The Cancellations tab MUST render: cancellationEnabled (toggle/checkbox), cancellationLimitHours (number, 0–168, disabled when cancellationEnabled=false).

#### Scenario: Toggle disables hours field
- GIVEN cancellationEnabled=false → THEN cancellationLimitHours field is disabled

#### Scenario: Toggle enables hours field
- GIVEN cancellationEnabled=true → THEN cancellationLimitHours field is editable with current value

### Requirement: Client Guard
The system SHALL use a `SettingsGuard` Client Component wrapping the page that checks `requiredPermissions` prop and redirects unauthorized roles before tab rendering.

#### Scenario: Admin passes guard
- GIVEN user has `settings:manage` → THEN guard renders children
