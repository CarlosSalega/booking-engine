# Delta for Bookings

## MODIFIED Requirements

### Requirement: Guest Checkout

`patientId` SHALL be `z.uuid().optional()`. `bookingSchema` and `bookingDataSchema` accept absent patientId. All other fields unchanged.
(Previously: patientId was required `z.uuid()`.)

#### Scenario: Guest booking parses
- GIVEN booking without patientId → THEN parse succeeds

#### Scenario: Booking with patient still valid
- GIVEN booking with patientId → THEN parse succeeds

## ADDED Requirements

### Requirement: Data Access Layer

Seven pure async functions. First param `organizationId`. No React/Next.js. PROFESSIONAL filtered at data layer.

| Function | Description |
|----------|-------------|
| `getBookings(orgId, filters?)` | Paginated + patient/pro/service/payments. Filters: dateRange, professionalId, serviceId, status[], search |
| `getBookingById(orgId, id)` | Full detail, all relations. Null if missing |
| `checkAvailability(orgId, profId, start, end, excludeId?)` | Boolean. Query: `startTime < newEnd AND endTime > newStart` |
| `getAvailableSlots(profId, serviceId, date)` | Open slots from duration minus booked |
| `getProfessionalsForService(serviceId)` | Active professionals for wizard step 2 |
| `getServices()` | Active services for wizard step 1 |
| `getPatients(search?)` | Patients by name/email for wizard step 4 |

#### Scenario: Filtered list and professional scoping
- GIVEN status=["CONFIRMED"], caller PROFESSIONAL → THEN matching own bookings

#### Scenario: Availability check
- GIVEN overlapping booking excluding reschedule ID → THEN returns false

#### Scenario: Slot occupied
- GIVEN overlapping booking exists → THEN checkAvailability returns true

### Requirement: Server Actions

Six `"use server"` actions. Each SHALL: Zod 4 validate → `getOrganizationId()` → RBAC (ADMIN/SECRETARY full; PROFESSIONAL own) → return `{ success, data } | { success, error }`.

| Action | Key Behavior |
|--------|-------------|
| `createBooking(data)` | Verify service ACTIVE, calc endTime. `$transaction`: overlap check + insert. Guest OK. |
| `confirmBooking(id)` | `canTransition(from, CONFIRMED)`. Optimistic lock via `updatedAt` in where. |
| `cancelBooking(id, reason?)` | `canTransition(from, CANCELLED)`. Set status, append reason. |
| `completeBooking(id)` | `canTransition(from, COMPLETED)`. Optimistic lock. |
| `markNoShow(id)` | `canTransition(from, NO_SHOW)`. Optimistic lock. |
| `rescheduleBooking(id, newStartTime)` | `canTransition(from, RESCHEDULED)`. Overlap check exclude self. `$transaction`: old→RESCHEDULED, new PENDING. |

All actions SHALL catch Prisma `P2025` and return "Modified by another user".

#### Scenario: Create success and failure
- GIVEN valid input, slot free → THEN success with PENDING. GIVEN overlap → THEN "Slot is occupied"

#### Scenario: Transition validation
- GIVEN PENDING → confirm → CONFIRMED. GIVEN COMPLETED → confirm → "Not a valid transition"

#### Scenario: Concurrent update and guest
- GIVEN updatedAt mismatch → THEN "Modified by another user". GIVEN patientId absent → THEN creation succeeds

#### Scenario: Reschedule workflow
- GIVEN free slot → THEN old RESCHEDULED, new PENDING. GIVEN occupied → THEN "Desired slot is occupied"

### Requirement: List Page (`/dashboard/bookings`)

Server Component, Suspense. Filters: dateRange, professional, service, status[], search. Table: date/time, patient, professional, service, status badge, payment badge, amount. Responsive: table desktop, cards mobile. Empty state. RBAC scoping.

#### Scenario: Multi-status filter
- GIVEN status=["PENDING","CONFIRMED"] → THEN matching rows only

#### Scenario: Empty state
- GIVEN zero matches → THEN "No bookings" rendered

### Requirement: Detail Page (`/dashboard/bookings/[id]`)

Server Component. Shows: patient, professional, service, payments[], two badges, notes. Action buttons gated by `canTransition` + role. 404 for not-found/unauthorized.

#### Scenario: Action buttons for live booking
- GIVEN CONFIRMED, role=SECRETARY → THEN Reschedule/Complete/No-Show/Cancel buttons

#### Scenario: No actions on terminal
- GIVEN status=COMPLETED → THEN no action buttons shown

### Requirement: Creation Wizard (`/dashboard/bookings/new`)

Six-step: (1) service, (2) professional filtered by service, (3) available slots, (4) patient search OR guest form (name/phone/email), (5) payment placeholder, (6) confirm + create. Zustand store cleared on mount. Step validation blocks advance. Progress indicator.

**Step 4 customer-mode switch**: The customer-mode switch (existing patient vs. new guest) MUST be implemented as a valid `radiogroup` (either native radio inputs or a shadcn/Radix `ToggleGroup` with `type="single"`) with correct ARIA semantics:

- The container MUST have `role="radiogroup"` (or use Radix `ToggleGroup` which provides this automatically).
- Each option MUST have `role="radio"` (or be a Radix `ToggleGroupItem` which provides this).
- The selected option MUST have `aria-checked="true"`; unselected options MUST have `aria-checked="false"`.
- Arrow-key navigation MUST move focus between options (handled automatically by Radix `ToggleGroup` or native radio group behavior).
- The radiogroup MUST have an accessible label (via `aria-label` or `aria-labelledby`) in Spanish (e.g. "Modo de paciente").
- The previous `role="tablist"` / `role="tab"` markup MUST NOT be present on this control.

**Progress indicator**: The wizard's step progress indicator MUST NOT communicate state by color alone. Each step MUST be identifiable by:

- A visible text label (step number + step name, e.g. "1. Servicio").
- `aria-current="step"` on the current step element.
- Color MAY supplement the indication but MUST NOT be the sole channel.

**Step loading**: Content loading within wizard steps MUST use `Skeleton` components (shimmer placeholders) rather than spinners. This applies to step 4 patient search results and any other step that loads data asynchronously.

(Previously: Creation Wizard required six-step flow with progress indicator and step validation, but step 4 used a fake `tablist` with no keyboard contract, progress was color-only, and loading used spinners.)

#### Scenario: Complete and guest paths
- GIVEN all steps filled, patient selected → creates booking. GIVEN guest form → creates without patientId

#### Scenario: Step validation and slot filtering
- GIVEN no service → blocked at step 1. GIVEN professional booked 09:00–09:30, service=30min → step 3 shows 09:30+

#### Scenario: Step 4 radiogroup semantics
- GIVEN the wizard is on step 4
- WHEN inspecting the customer-mode switch
- THEN the container has `role="radiogroup"` (or is a Radix `ToggleGroup`)
- AND each option has `role="radio"` with `aria-checked` reflecting selection
- AND no `role="tablist"` or `role="tab"` is present on this control

#### Scenario: Step 4 arrow-key navigation
- GIVEN focus is on the first radio option in step 4
- WHEN the user presses ArrowRight or ArrowDown
- THEN focus moves to the next radio option
- AND `aria-checked` updates to reflect the new selection

#### Scenario: Step 4 radiogroup has accessible label
- GIVEN the wizard is on step 4
- WHEN inspecting the radiogroup
- THEN it has `aria-label` or `aria-labelledby` in Spanish (e.g. "Modo de paciente")

#### Scenario: Progress indicator non-color channel
- GIVEN the wizard is on step 3
- WHEN inspecting the progress indicator
- THEN the current step has `aria-current="step"`
- AND the current step displays a visible text label (step number + name)
- AND the step is distinguishable from completed/pending steps without relying on color alone

#### Scenario: Step 4 patient search loading uses skeleton
- GIVEN the wizard is on step 4 and patient search is in progress
- WHEN the loading state is active
- THEN `Skeleton` components are rendered (not a spinner)
