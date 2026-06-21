# Proposal: Bookings Application + Presentation Layers

## Intent

Secretaries and admins cannot manage bookings today — no list view, no creation flow, no status transitions. The domain layer (status machine, TimeSlot VO, Zod schemas) is complete but has no consumers. This change builds the application and presentation layers so staff can list, create, filter, and transition bookings through their full lifecycle.

## Scope

### In Scope

1. **Schema migration**: `patientId` → optional (guest checkout support per feature doc §7)
2. **Data access layer** (`src/modules/bookings/data/`): `getBookings(filters)`, `getBookingById(id)`, `checkAvailability(professionalId, startTime, endTime, excludeBookingId?)`, `getAvailableSlots(professionalId, serviceId, date)`, `getProfessionalsForService(serviceId)`, `getServices()`, `getPatients(search?)`
3. **Server actions** (`src/modules/bookings/actions/`): `createBooking`, `confirmBooking`, `cancelBooking`, `completeBooking`, `rescheduleBooking`, `markNoShow` — all with RBAC, Zod 4 input validation, optimistic locking via `updatedAt`
4. **List page** (`/bookings`): Server Component, date-range / professional / service / status filters, text search, payment columns
5. **Detail page** (`/bookings/[id]`): full booking detail with status action buttons
6. **Creation wizard** (`/bookings/new`): 6-step flow (service → professional → schedule → customer → payment placeholder → confirmation)
7. **Presentational components** (`src/components/bookings/`): `booking-table`, `booking-filters`, `booking-detail`, `booking-status-badge`, `wizard/` (6 step components)
8. **Tests** (Strict TDD): data layer + action tests via Vitest

### Out of Scope

- Calendar view (`/dashboard/calendar`) — separate change
- Payment integration (MercadoPago) — wizard step 5 is placeholder
- Email notifications
- Booking history/timeline in detail view
- Professional availability exceptions / manual blockouts

## Capabilities

### New Capabilities

- `bookings-data`: Prisma data access — paginated list with filters, detail, availability check, available slots, wizard reference data
- `bookings-actions`: Server actions for create + 5 status transitions with RBAC, overlap validation, optimistic locking
- `bookings-list`: List page with advanced filters, data table, status badges
- `bookings-detail`: Detail page with status action buttons gated by RBAC + state machine
- `bookings-wizard`: Multi-step creation flow (6 steps) with per-step validation

### Modified Capabilities

- `bookings-domain`: `patientId` becomes optional in `bookingSchema` to match migration. `canTransition` unchanged.

## Approach

- **Data layer pattern**: Pure async functions, `prisma` from `@/lib/prisma`, `organizationId` as first param (follows `dashboard-data.ts`). No React/Next.js imports.
- **Overlap validation**: `checkAvailability` queries `startTime < newEnd AND endTime > newStart` for the professional. `createBooking` wraps check + insert in `prisma.$transaction` to prevent race conditions.
- **Optimistic locking**: Updates include `updatedAt` in `where` clause; catch Prisma P2025 → return conflict error.
- **Wizard state**: URL-driven steps (`?step=1..6`) with `useActionState` for server-side validation per step. No external state library.
- **RBAC**: Actions call `getOrganizationId()` + check session role. Data layer accepts `organizationId`; role-based filtering (PROFESSIONAL sees only own bookings) applied in `getBookings`.
- **Migration**: `patientId String` → `patientId String?` in Prisma schema. `prisma migrate dev` with descriptive name. Domain `bookingSchema.patientId` becomes `z.uuid().optional()`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | `patientId` → optional, run migration |
| `src/modules/bookings/data/` | New | 7 data access functions + tests |
| `src/modules/bookings/actions/` | New | 6 server actions + input schemas + tests |
| `src/modules/bookings/domain/booking.schema.ts` | Modified | `patientId` → optional |
| `src/modules/bookings/index.ts` | Modified | Export data + actions layers |
| `src/app/(dashboard)/bookings/` | New | 3 route pages: list, detail, wizard |
| `src/components/bookings/` | New | Table, filters, detail, status-badge, wizard/ |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Overlap race condition on concurrent create | Medium | `prisma.$transaction` with SELECT + INSERT; unique constraint on (professionalId, startTime) as backup |
| Migration breaks existing seed data | Low | `patientId` becomes optional — existing rows keep their values, no data loss |
| Wizard complexity exceeds 400-line PR budget | Medium | Split wizard into its own PR; 6 steps as small presentational components |
| No data-layer precedent for business modules | Low | Follow `dashboard-data.ts` conventions exactly; this IS the precedent |

## Rollback Plan

1. Migration is backward-compatible (required → optional). Revert: `patientId` back to required, run `prisma migrate dev`. Data with null `patientId` must be cleaned first.
2. New routes (`/bookings/*`) are additive — remove routes + components to rollback presentation.
3. Server actions are new — no existing callers to break.

## Dependencies

- `getOrganizationId()` from `src/modules/dashboard/data/get-organization-id.ts` (exists)
- `formatCurrency`, `formatTime`, `getBookingStatusLabel` from `src/modules/dashboard/presentation/formatters.ts` (exists)
- `canTransition`, `calculateEndTime`, `isOverlapping` from domain (exists)
- Prisma models: Service (duration, price, paymentType), Professional, Patient (exist)
- No new npm packages required

## Success Criteria

- [ ] Secretary can list bookings with filters (date range, professional, service, status, text search)
- [ ] Secretary can create a booking through 6-step wizard
- [ ] All 6 status transitions work with RBAC enforcement
- [ ] Overlap validation prevents double-booking under concurrent requests
- [ ] Guest checkout works (booking without patient)
- [ ] All data layer + action tests pass (Strict TDD)
- [ ] Each PR within 400-line review budget (6 chained PRs)
