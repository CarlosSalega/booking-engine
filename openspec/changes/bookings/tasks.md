# Tasks: Bookings Module — Application + Presentation Layers

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1850 (5 PRs: 350+450+350+300+400) |
| 400-line budget risk | High (PR #2 ~450) |
| Chained PRs recommended | Yes |
| Suggested split | PR #1→#2→#3→#4→#5 (stacked to main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No (design already approved)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Work Units (base = main, each PR merges after prior)

- **PR #1** (~350): 7 data fns + migration + domain schema
- **PR #2** (~450): 6 server actions; split #2a/#2b if review overflows
- **PR #3** (~350): list page + 8 components
- **PR #4** (~300): detail page + 2 components
- **PR #5** (~400): wizard + store + 6 steps + 2 helpers

**Out of scope**: calendar view, MercadoPago, email notifications, dedicated guest columns.

## Phase 1: PR #1 — Data Layer + Migration

Verify: `pnpm test && pnpm type-check && pnpm prisma migrate dev && pnpm db:seed`.

- [x] 1.1 [RED] `data/__tests__/booking-data.test.ts` — mock `prisma`; `getBookings` (filters+PROFESSIONAL), `getBookingById`, `getServices` (ACTIVE), `getPatients` (search), `getProfessionalsForService`
- [x] 1.2 [GREEN] `data/booking-data.types.ts` (`EnrichedBooking`, `BookingFilters`) + `data/booking-data.ts` (5 fns, follow `dashboard-data.ts`: orgId first, no framework imports)
- [x] 1.3 [REFACTOR] Extract Prisma `include`; JSDoc per fn
- [x] 1.4 [RED] `data/__tests__/booking-availability.test.ts` — overlap true/false, adjacent not, self-exclude, slot calc
- [x] 1.5 [GREEN] `data/booking-availability.ts` — `checkAvailability`, `getAvailableSlots` (30-min 08–20h, filter occupied)
- [x] 1.6 [MIGR] `prisma/schema.prisma` — `patientId String→String?`, `Patient→Patient?`, `onDelete: Cascade→SetNull`
- [x] 1.7 [MIGR] `pnpm prisma migrate dev --name make_booking_patient_optional`
- [x] 1.8 [DOMAIN] `domain/booking.schema.ts` — `patientId: z.uuid()→z.uuid().optional()`
- [x] 1.9 [DOMAIN] `domain/__tests__/booking.test.ts` — guest parses, with patient still valid
- [x] 1.10 [SEED] `prisma/seed.ts` — add 1–2 guest bookings (`patientId: null`, notes with guest info)
- [x] 1.11 [BARREL] `index.ts` — export data + types
- [x] 1.12 [VERIFY] All green, Prisma client regenerated

## Phase 2: PR #2 — Server Actions

Verify: `pnpm test && pnpm type-check`. Depends on PR #1 (data fns, `Patient?` type).

- [x] 2.1 [TYPES] `actions/booking-actions.types.ts` — `BookingResult<T>`, 6 `*Input` types
- [x] 2.2 [RED] `actions/__tests__/booking-actions.schema.test.ts` — 6 schemas: happy+invalid
- [x] 2.3 [GREEN] `actions/booking-actions.schema.ts` — 6 Zod 4 schemas (`z.uuid().optional()`, `error:` param)
- [x] 2.4 [RED] `actions/__tests__/create-booking.test.ts` — mock prisma+auth+headers; success, overlap, guest, invalid, PROFESSIONAL foreign-id
- [x] 2.5 [GREEN] `actions/create-booking.action.ts` — `"use server"` → Zod → session → `getOrganizationId` → RBAC → `$transaction(overlap+insert)` → guest into `notes` → `revalidatePath` → `BookingResult<Booking>`
- [x] 2.6 [RED] `actions/__tests__/confirm-booking.test.ts` — PENDING→CONFIRMED, COMPLETED reject, P2025
- [x] 2.7 [GREEN] `actions/confirm-booking.action.ts` — `canTransition` + `where: {id,updatedAt}` optimistic lock → catch P2025
- [x] 2.8 [RED] `actions/__tests__/cancel-booking.test.ts` — CONFIRMED→CANCELLED, terminal reject, reason in notes
- [x] 2.9 [GREEN] `actions/cancel-booking.action.ts` — mirror confirm; append `reason` to `notes`
- [x] 2.10 [R+G] `actions/complete-booking.action.ts` — mirror confirm
- [x] 2.11 [R+G] `actions/mark-no-show.action.ts` — mirror confirm
- [x] 2.12 [RED] `actions/__tests__/reschedule-booking.test.ts` — free slot (old→RESCHEDULED + new→PENDING), occupied, P2025
- [x] 2.13 [GREEN] `actions/reschedule-booking.action.ts` — `$transaction`: `canTransition` + exclude-self overlap + update old + create new
- [x] 2.14 [BARREL] `index.ts` — export actions + types
- [x] 2.15 [VERIFY] 6 actions + 6 schemas covered, no `any`

## Phase 3: PR #3 — List Page

Verify: `pnpm test && pnpm type-check` + manual filter check. Depends on PR #1, #2.

- [x] 3.1 [UTILS] `presentation/formatters.ts` — `formatBookingDate`, `formatBookingTime` (es-AR Intl)
- [x] 3.2 [C] `components/bookings/booking-status-badge.tsx` — status-tone map
- [x] 3.3 [C] `components/bookings/booking-payment-badge.tsx` — NONE/DEPOSIT/FULL
- [x] 3.4 [C] `components/bookings/booking-empty-state.tsx`
- [x] 3.5 [C] `components/bookings/booking-table-skeleton.tsx`
- [x] 3.6 [C] `components/bookings/booking-search-bar.tsx` — URL `?search=`
- [x] 3.7 [C] `components/bookings/booking-filters.tsx` — status+prof+service+date range → URL
- [x] 3.8 [C] `components/bookings/booking-table.tsx` — Table+Badges, row→detail
- [x] 3.9 [PAGE] `app/(dashboard)/dashboard/bookings/page.tsx` — Server, `getOrganizationId`+session → searchParams → `BookingsTableDataWrapper` (Suspense) → Table+Filters+SearchBar (mirror `dashboard/page.tsx`)
- [x] 3.10 [V] Manual: `status=CONFIRMED`; PROFESSIONAL sees own

## Phase 4: PR #4 — Detail Page

Verify: `pnpm test && pnpm type-check` + manual action flow. Depends on PR #1, #2.

- [x] 4.1 [C] `components/bookings/booking-detail.tsx` — header+info (reuse `formatCurrency` from dashboard)
- [x] 4.2 [C] `components/bookings/booking-detail-actions.tsx` — buttons gated by `canTransition`+role; call action with `id,updatedAt`
- [x] 4.3 [PAGE] `app/(dashboard)/bookings/[id]/page.tsx` — `getBookingById` → `notFound()`; PROFESSIONAL own-only
- [x] 4.4 [V] Manual: confirm/cancel/complete/no-show/reschedule; P2025 toast

## Phase 5: PR #5 — Creation Wizard

Verify: `pnpm test && pnpm type-check` + full + guest flow. Depends on PR #1, #2.

- [x] 5.1 [STORE] `presentation/wizard-store.ts` — Zustand 5, 11 setters+step nav+`reset`; no `persist`
- [x] 5.2 [RED] `presentation/__tests__/wizard-store.test.ts` — step bounds, `setService` resets downstream, `reset` returns initial
- [x] 5.3 [GREEN] Refactor if needed
- [x] 5.4 [C] `wizard/wizard-progress.tsx` — 6 step dots
- [x] 5.5 [C] `wizard/wizard-navigation.tsx` — prev/next with per-step validation
- [x] 5.6 [C] `wizard/wizard-step-service.tsx` — service cards (`getServices`)
- [x] 5.7 [C] `wizard/wizard-step-professional.tsx` — filtered by `serviceId`
- [x] 5.8 [C] `wizard/wizard-step-schedule.tsx` — date picker+slot grid (`getAvailableSlots`)
- [x] 5.9 [C] `wizard/wizard-step-customer.tsx` — debounced `getPatients` OR guest form
- [x] 5.10 [C] `wizard/wizard-step-payment.tsx` — placeholder, reads `service.paymentType`
- [x] 5.11 [C] `wizard/wizard-step-confirm.tsx` — summary + "Confirmar Turno" → `createBooking` → redirect
- [x] 5.12 [PAGE] `app/(dashboard)/bookings/new/page.tsx` — Client, `useEffect: store.reset()` on mount, render step by `currentStep`
- [x] 5.13 [V] Manual: full 6-step + guest + cancel mid-wizard resets
