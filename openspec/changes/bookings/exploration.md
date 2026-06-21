# Exploration: Bookings Module — Application + Presentation Layers

## Current State

### What EXISTS (domain layer — complete)

| Artifact | Path | Contents |
|----------|------|----------|
| Booking entity | `src/modules/bookings/domain/booking.ts` | `BookingStatus` (7 states), `canTransition` state machine, `calculateEndTime` |
| TimeSlot VO | `src/modules/bookings/domain/time-slot.ts` | `TimeSlot` interface, `isValidTimeSlot`, `isOverlapping` (strict boundary: adjacent = no overlap) |
| Zod 4 schemas | `src/modules/bookings/domain/booking.schema.ts` | `bookingSchema` (12 fields), `bookingDataSchema` (omit id/createdAt/updatedAt, strict) |
| Domain tests | `src/modules/bookings/domain/__tests__/booking.test.ts` | 365 lines — status machine, overlap, schemas, barrel completeness, module isolation |
| Module barrel | `src/modules/bookings/index.ts` | Re-exports `./domain` only |
| Prisma model | `prisma/schema.prisma` L149-172 | `Booking` with FK to Patient, Professional, Service, Payment. Indexes on orgId, patientId, professionalId, status, startTime |
| Seed data | `prisma/seed.ts` | 20 bookings across 7 statuses, spread over ±7 days. 8 services, 2 professionals, 5 patients |

### What EXISTS (adjacent patterns to follow)

| Pattern | Where | How it works |
|---------|-------|-------------|
| Data access | `src/modules/dashboard/data/dashboard-data.ts` | Pure async functions, `prisma` import from `@/lib/prisma`, takes `organizationId` as param. No React, no Next.js. |
| Server Actions | `src/modules/auth/actions/login.action.ts` | `"use server"` directive, Zod validation first, returns `AuthResult<T>` pattern (`{ success, data } | { success, error }`) |
| Org scoping | `src/modules/dashboard/data/get-organization-id.ts` | Cached module-level lookup. Single-org for now. |
| Presentation | `src/modules/dashboard/presentation/formatters.ts` | Pure functions, no framework deps. `formatCurrency`, `formatTime`, `getBookingStatusLabel` |
| Server Components | `src/components/dashboard/today-bookings.tsx` | Async server component, receives `organizationId` prop, calls data function, renders table with shadcn/ui |
| Page composition | `src/app/(dashboard)/dashboard/page.tsx` | Server Component, `Suspense` boundaries, data-loading wrappers for async boundaries |
| RBAC gate | `src/app/(dashboard)/layout.tsx` | Redirects PATIENT role to `/`. Better Auth proxy handles auth. |

### What is MISSING (the gap)

| Layer | What needs to be built |
|-------|----------------------|
| **Data access** | Prisma queries: list, get-by-id, get-by-date-range, get-by-professional, overlap check |
| **Server Actions** | create, cancel, reschedule, confirm, complete, no-show, status transitions |
| **List page** | `/dashboard/bookings` — table with filters (status, professional, date range) |
| **Detail page** | `/dashboard/bookings/[id]` — booking detail with status actions |
| **Creation flow** | Multi-step form: service → professional → time slot → patient → confirm |
| **Calendar view** | `/dashboard/calendar` — weekly/daily grid view of bookings |
| **Overlap validation** | Server-side: query existing bookings for professional + time range, reject if overlap |
| **Optimistic locking** | Prisma `updatedAt` check on update to prevent double-booking |

---

## Affected Areas

- `src/modules/bookings/` — **EXPAND** with `data/`, `actions/`, `presentation/` subdirectories
- `src/modules/bookings/index.ts` — update barrel to export new layers
- `src/app/(dashboard)/bookings/` — **NEW** route: list page, detail page, creation flow
- `src/app/(dashboard)/calendar/` — **NEW** route: calendar view
- `src/components/bookings/` — **NEW** presentational components (booking table, status badge, creation form steps)
- `src/components/calendar/` — **NEW** calendar grid components
- `prisma/schema.prisma` — **NO CHANGES** needed (Booking model already complete with indexes)
- `src/modules/dashboard/data/dashboard-data.ts` — **NO CHANGES** (already queries bookings for metrics)

---

## Dependencies

### Modules bookings DEPENDS ON

| Module | What bookings needs | Current state |
|--------|-------------------|---------------|
| **services** | `service.durationMinutes` (to calculate endTime), `service.price` (for payment), `service.paymentType` (NONE/DEPOSIT/FULL), `service.status` (must be ACTIVE) | Domain only (types + schemas). Prisma model exists. **No data access layer.** |
| **professionals** | `professional.id` validation, professional name for display | Domain only. Prisma model exists. **No data access layer.** |
| **patients** | `patient.id` validation, patient name/email for display, guest checkout support | Domain only. Prisma model exists. **No data access layer.** |
| **payments** | Create payment after booking (if service requires it), payment status affects booking status | Domain only. Prisma model exists. **No data access layer.** |
| **auth** | `getOrganizationId()` for tenant scoping, RBAC (ADMIN/SECRETARY/PROFESSIONAL permissions), session for current user | Complete. Actions, hooks, roles, permissions all defined. |
| **dashboard** | Reuse `getOrganizationId()` and `formatCurrency`/`formatTime`/`getBookingStatusLabel` formatters | Complete. |

### Critical observation

**No other module has a data access layer yet.** The dashboard module queries Prisma directly for bookings, patients, payments. The bookings module will be the FIRST to establish the `data/` layer pattern for a business domain module. This sets the precedent for all future modules.

---

## Approaches

### 1. Full Data Layer + List + Actions (MVP)

Build the data access layer, server actions for CRUD + status transitions, and the list page with filters. Defer calendar view and multi-step creation form.

**Pros:**
- Establishes the data access pattern all other modules will follow
- List page delivers immediate operational value (secretaries can see/manage bookings)
- Server actions are testable in isolation (pure functions with Zod validation)
- Calendar and creation form are separate concerns — don't block on them
- Fits within 400-line PR budget with chained PRs

**Cons:**
- No visual calendar (secretaries currently think in calendar terms)
- Creation via list page is less intuitive than a guided flow
- Overlap validation is partial without the full creation flow

**Effort:** Medium (3-4 chained PRs, ~800-1000 lines)

### 2. Full Stack Including Calendar + Creation Form

Build everything: data layer, actions, list, detail, creation form, calendar view.

**Pros:**
- Complete feature delivery — users get the full booking management experience
- Calendar view is the natural interface for booking management
- Multi-step creation matches the feature doc flow (§5)

**Cons:**
- MASSIVE scope — easily 2000+ lines
- Calendar component is a complex UI piece (weekly grid, drag-to-create, time slots)
- Multi-step form needs state management across steps
- Violates single-responsibility per change
- Cannot fit in 400-line PRs without 6+ chained PRs

**Effort:** Very High (6+ PRs, 2000+ lines)

### 3. Data Layer + Actions + Calendar (Skip Creation Form)

Build data access, server actions, list page, and calendar view. Creation via a simple dialog/form (not multi-step).

**Pros:**
- Calendar delivers visual booking management
- Simple creation form is faster to build than multi-step wizard
- Actions and data layer are reusable by any future UI

**Cons:**
- Calendar is still complex (needs a library or custom grid)
- Simple creation form may not capture all required fields elegantly
- Still a large change

**Effort:** High (4-5 PRs, ~1400 lines)

---

## Recommendation

**Approach 1: Full Data Layer + List + Actions (MVP)**

**Why:**
1. The data access layer is the FOUNDATION. Every other module will need one. Building it right for bookings sets the pattern.
2. The list page + server actions deliver immediate operational value. A secretary can see all bookings, filter by status/professional/date, cancel, confirm, reschedule.
3. Calendar view and multi-step creation are PRESENTATION concerns that should be separate changes. They depend on the data layer but are independent of each other.
4. This keeps the change scoped and reviewable within the 400-line-per-PR budget.

**Suggested file structure:**

```
src/modules/bookings/
├── domain/                          # EXISTS — no changes
│   ├── booking.ts
│   ├── time-slot.ts
│   ├── booking.schema.ts
│   ├── __tests__/
│   └── index.ts
├── data/                            # NEW — Prisma queries
│   ├── booking-data.ts              # getBookings, getBookingById, getBookingsByDateRange, etc.
│   ├── booking-availability.ts      # checkOverlap, getAvailableSlots
│   └── __tests__/
├── actions/                         # NEW — Server Actions
│   ├── create-booking.action.ts
│   ├── cancel-booking.action.ts
│   ├── confirm-booking.action.ts
│   ├── reschedule-booking.action.ts
│   ├── complete-booking.action.ts
│   ├── no-show-booking.action.ts
│   ├── booking-schemas.ts           # Action input schemas (Zod 4)
│   └── __tests__/
├── presentation/                    # NEW — Formatters, helpers
│   ├── formatters.ts                # Booking-specific display helpers
│   └── index.ts
└── index.ts                         # UPDATE — export all layers
```

**Data access function signatures:**

```typescript
// booking-data.ts
export async function getBookings(organizationId: string, filters?: BookingFilters): Promise<Booking[]>
export async function getBookingById(organizationId: string, id: string): Promise<Booking | null>
export async function getBookingsByDateRange(organizationId: string, start: Date, end: Date): Promise<Booking[]>
export async function getBookingsByProfessional(organizationId: string, professionalId: string, dateRange?: { start: Date; end: Date }): Promise<Booking[]>

// booking-availability.ts
export async function checkOverlap(organizationId: string, professionalId: string, startTime: Date, endTime: Date, excludeBookingId?: string): Promise<boolean>
```

**Server Action pattern (following auth/actions convention):**

```typescript
"use server";

export async function createBooking(input: CreateBookingInput): Promise<ActionResult<Booking>> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue.message };

  const organizationId = await getOrganizationId();

  // 1. Validate service exists and is ACTIVE
  // 2. Calculate endTime from service.durationMinutes
  // 3. Check overlap with existing bookings
  // 4. Create booking with PENDING status
  // 5. If service.paymentType !== NONE, create payment record
  // 6. Return created booking
}
```

**Optimistic locking strategy:**

Use Prisma's `updatedAt` field. On update, include `updatedAt` in the `where` clause:

```typescript
await prisma.booking.update({
  where: { id, updatedAt: expectedUpdatedAt },
  data: { status: newStatus },
});
// Throws P2025 if updatedAt doesn't match → catch and return conflict error
```

---

## Complexity Assessment

### High complexity

| Area | Why it's tricky |
|------|----------------|
| **Overlap detection** | Must query bookings where `professionalId` matches AND time ranges overlap. The domain's `isOverlapping` is pure — but the data layer needs to translate it to a Prisma query: `startTime < newEnd AND endTime > newStart`. Must exclude the booking being rescheduled. Must handle timezone edge cases. |
| **Optimistic locking** | Prisma 7 has no built-in optimistic locking. Must use `updatedAt` in the `where` clause and handle `P2025` (record not found) errors. The `updatedAt` field already exists on the Booking model. |
| **Multi-step creation form** | Requires client-side state management across 4+ steps, validation at each step, and server-side validation on submit. Dependencies: service duration → endTime calculation → overlap check → payment creation. |

### Medium complexity

| Area | Why |
|------|-----|
| **Calendar view** | Needs a weekly/daily grid component. No existing calendar library in the project. Could use `date-fns` for date math. Rendering bookings as positioned blocks on a time grid is non-trivial. |
| **RBAC filtering** | PROFESSIONAL should only see own bookings. ADMIN/SECRETARY see all. Must filter at the data layer, not the UI layer. |
| **Status transition validation** | Must use `canTransition` from domain before updating. Server action must validate the transition is legal. |

### Low complexity

| Area | Why |
|------|-----|
| **List page with filters** | Standard table with shadcn/ui components. Filters are query params. |
| **Server Actions for status transitions** | Simple: validate input → check canTransition → update status. |
| **Formatters** | Pure functions, reuse existing dashboard formatters. |

---

## Risks

1. **No data access pattern exists yet for business modules** — The dashboard queries Prisma directly. The bookings module will set the precedent. Must get the pattern right (organizationId scoping, error handling, return types).
2. **Overlap race condition** — Two concurrent create-booking requests for the same professional + time slot. Optimistic locking on `updatedAt` helps for updates, but creation needs a unique constraint or transaction-level check. Consider `prisma.$transaction` with a SELECT ... FOR UPDATE pattern.
3. **Calendar library decision** — Building a custom calendar grid is expensive. Options: `@fullcalendar/react` (heavy but complete), `react-big-calendar` (medium), custom with `date-fns` (light but more work). Recommendation: defer to a separate change.
4. **Guest checkout** — Feature doc §7 says "cliente puede ser anónimo (guest checkout)". But the Prisma model requires `patientId` (FK to Patient). Need to decide: create a guest patient record? Make patientId optional? This is a schema decision that affects the domain.
5. **Payment integration on creation** — Feature doc §10 says payment status affects booking status. For MVP, defer payment creation to a separate change. Bookings start as PENDING regardless of payment.
6. **Timezone handling** — All dates are stored as `DateTime` (UTC in PostgreSQL). The dashboard uses server local time for bucketing. Calendar view needs consistent timezone handling.

---

## Suggested Phasing (Chained PRs)

| PR | Scope | Est. Lines |
|----|-------|------------|
| **#1: Data access layer** | `booking-data.ts` (list, get-by-id, get-by-range, get-by-professional), `booking-availability.ts` (checkOverlap), tests. Establish the pattern. | ~300 |
| **#2: Server Actions** | Create, cancel, confirm, reschedule, complete, no-show. Input schemas. Overlap validation on create. Optimistic locking on update. Tests. | ~400 |
| **#3: List page + filters** | `/dashboard/bookings/page.tsx`, booking table component, status filter, professional filter, date range filter. Server Component with Suspense. | ~350 |
| **#4: Detail page + status actions** | `/dashboard/bookings/[id]/page.tsx`, booking detail view, status action buttons (cancel, confirm, etc.), RBAC-based action visibility. | ~300 |

**Total:** ~1350 lines across 4 PRs. Each within or near the 400-line budget.

**Deferred to separate changes:**
- Calendar view (`/dashboard/calendar`) — separate change, depends on data layer
- Multi-step creation form — separate change, depends on data layer + actions
- Payment integration on booking creation — separate change, depends on payments data layer
- Guest checkout — requires schema decision (patientId optional vs. guest patient)

---

## Ready for Proposal

**Yes.** The exploration has enough context to proceed to `sdd-propose`. The key decisions are:

1. **Data layer first** — establish the pattern all other modules will follow
2. **Server Actions with Zod 4 validation** — following the auth module convention
3. **List + Detail pages** — Server Components with Suspense, shadcn/ui tables
4. **Optimistic locking via `updatedAt`** — Prisma P2025 error handling
5. **Calendar and creation form deferred** — separate changes, smaller scope
6. **4 chained PRs** for reviewability

The orchestrator should tell the user: *"We'll build the bookings data access layer, server actions, and list/detail pages first — establishing the pattern for all business modules. Calendar view and multi-step creation form are deferred to separate changes. Split into 4 chained PRs: data layer, actions, list page, detail page."*
