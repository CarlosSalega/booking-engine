# Tasks: Calendar View

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950 (PR #1: 380, PR #2: 570) |
| 400-line budget risk | Medium (PR #2 includes shadcn popover+select generated code) |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 → PR #2 (stacked to main, base = main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |
| TDD mode | STRICT — every GREEN task is preceded by a [RED] task in the same PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Work Units (base = main, each PR merges after prior)

- **PR #1** (~380, 11 tasks): deps + utils + `STATUS_TONE_CLASS` extraction + custom event components + `useNextCalendarApp` wrapper + CSS theming + tests
- **PR #2** (~570, 16 tasks): shadcn popover+select + `getCalendarBookings` server action + canTransition update + popover + toolbar + empty state + page replacement (RBAC) + responsive + URL state + tests

**Out of scope**: drag-and-drop rescheduling, inline event creation, resource column view, booking creation/editing forms (reuse existing wizard + detail pages), email notifications.

### TDD Pairing

Every `[GREEN]` task is paired with a `[RED]` task that defines the failing test first. Tests live in `__tests__/` next to the implementation, matching the convention in `src/modules/bookings/data/__tests__/` and `src/components/bookings/__tests__/`.

### Open Questions Carried From Design

- Schedule-X version pinning: pin exact versions in `package.json` (already planned)
- Temporal polyfill bundle size: verify tree-shaking on calendar route in PR #1 verify
- **Spec gap surfaced**: spec requires PENDING → Reprogramar visible in popover but `canTransition(PENDING, RESCHEDULED)` currently returns `false`. PR #2 task 2.6 updates the policy; see in-PR note.

## Phase 1: PR #1 — Calendar Foundation

Verify: `pnpm test src/components/calendar && pnpm type-check && pnpm lint`. Depends on: existing `getBookings(orgId, { dateRange })`, `EnrichedBooking`, `STATUS_TONE_CLASS`, `temporal-polyfill` not yet installed.

- [x] 1.1 [DEPS] `package.json` — add `@schedule-x/react`, `@schedule-x/calendar`, `@schedule-x/theme-default`, `temporal-polyfill`; `pnpm install`; commit lockfile; verify pnpm-lock.yaml delta
- [x] 1.2 [RED] `src/components/calendar/__tests__/booking-calendar-utils.test.ts` — `bookingToCalendarEvent` (ISO→Temporal, status→calendarId, `_booking` ref preserved), `STATUS_CALENDAR_COLORS` (7 entries with `backgroundColor`/`borderColor`), `computeDateRange` (week: Mon–Sun; day: 0–24h; month: day-1 → day+1)
- [x] 1.3 [GREEN] `src/components/calendar/booking-calendar-utils.ts` — pure functions; `Temporal.ZonedDateTime.from(iso, "America/Argentina/Buenos_Aires")`; export `STATUS_CALENDAR_COLORS` matching design §AD6 hex values; `tzArg` constant
- [x] 1.4 [REFACTOR] Extract `STATUS_TONE_CLASS` from `src/components/bookings/booking-status-badge.tsx` → `src/modules/bookings/presentation/status-tones.ts`; also export `STATUS_HEX` (HSL pairs) for Schedule-X; re-export from `src/modules/bookings/presentation/index.ts`; update `booking-status-badge.tsx` import
- [x] 1.5 [RED] `src/components/calendar/__tests__/booking-calendar-events.test.tsx` — `timeGridEvent` renders patient name + service + start–end range; `monthGridEvent` renders dot marker + count badge
- [x] 1.6 [GREEN] `src/components/calendar/booking-calendar-event.tsx` — `"use client"`; receives `calendarEvent`; renders HH:mm–HH:mm range, patient name, service name; calls `onClick` parent prop (no popover state)
- [x] 1.7 [GREEN] `src/components/calendar/booking-calendar-month-event.tsx` — `"use client"`; renders dot + count; click→day view via `onClick` parent prop
- [x] 1.8 [RED] `src/components/calendar/__tests__/booking-calendar.test.tsx` — mock `useNextCalendarApp`; assert `events` shape, `calendars` derived from `STATUS_CALENDAR_COLORS`, `views: [week, day, monthGrid]`, `locale: 'es-AR'`, `firstDayOfWeek: 1`; `onEventClick` exposes popover state; `onRangeUpdate` callback wired
- [x] 1.9 [GREEN] `src/components/calendar/booking-calendar.tsx` — `"use client"`; `useNextCalendarApp` with `createViewWeek/createViewDay/createViewMonthGrid`; `calendars` built from `STATUS_CALENDAR_COLORS`; `callbacks.onEventClick` → `setPopoverState({event,x,y})`; `callbacks.onRangeUpdate` → debounced `refetch(range)`; forwardRef exposes `setEvents`
- [x] 1.10 [CSS] `src/components/calendar/booking-calendar.css` — override `--sx-color-primary`, `--sx-color-neutral`, font tokens to shadcn `var(--color-*)`; weekday header Lun–Dom via `dayBoundaries`; 30-min slots 08:00–20:00 via `dayGridOptions`/`weekGridOptions`
- [x] 1.11 [VERIFY] `pnpm test src/components/calendar` (all green) + `pnpm type-check` (clean) + `pnpm lint` (clean); `pnpm build` + bundle analyzer: `temporal-polyfill` ≤ 30KB gzip on `/dashboard/calendar` route

## Phase 2: PR #2 — Page + Popover + Toolbar + Empty State

Verify: `pnpm test && pnpm type-check && pnpm lint` + manual end-to-end. Depends on: PR #1 (wrapper, utils, custom events, CSS), existing `getBookings`, `getAvailableActions`, `confirmBooking`/`cancelBooking`/`completeBooking`/`markNoShow`/`rescheduleBooking` server actions, `Sheet` (already in `src/components/ui/`).

- [ ] 2.1 [DEPS] `pnpm dlx shadcn@canary add popover select` — generates `src/components/ui/popover.tsx`, `src/components/ui/select.tsx`; commit
- [ ] 2.2 [RED] `src/modules/bookings/actions/__tests__/get-calendar-bookings.test.ts` — mock session+auth+getOrganizationId+getBookings; ADMIN returns all (no `professionalUserId`); PROFESSIONAL scopes by `session.user.id`; URL `professionalId` honored for ADMIN/SECRETARY only; returns ISO-stringified dates
- [ ] 2.3 [GREEN] `src/modules/bookings/actions/get-calendar-bookings.action.ts` — `"use server"`; Zod `dateRangeSchema` (start/end ISO); session+orgId resolve; RBAC filter; calls `getBookings(orgId, { dateRange, professionalUserId? })`; serializes `startTime`/`endTime`→ISO; returns `EnrichedBooking[]`
- [ ] 2.4 [RED] `src/modules/bookings/domain/__tests__/booking.test.ts` — extend: `canTransition(PENDING, RESCHEDULED) === true` (spec scenario "PENDING shows Reprogramar"); `canTransition(CANCELLED, RESCHEDULED) === false` still holds
- [ ] 2.5 [GREEN] `src/modules/bookings/domain/booking.ts` — add `BookingStatus.RESCHEDULED` to `TRANSITIONS[PENDING]`; update JSDoc
- [ ] 2.6 [RED] `src/components/calendar/__tests__/booking-calendar-popover.test.tsx` — mock server actions; PENDING shows [Confirmar, Cancelar, Reprogramar, Ver detalle]; COMPLETED shows only [Ver detalle]; action click→calls server action + `router.refresh`; Ver detalle→`router.push(/dashboard/bookings/${id})`; viewport ≤768px renders `Sheet` instead of `Popover`
- [ ] 2.7 [GREEN] `src/components/calendar/booking-calendar-popover.tsx` — `"use client"`; shadcn `Popover`; header: patient name, service, HH:mm–HH:mm; body: `BookingStatusBadge`; actions: `getAvailableActions(status, role)` → mapped buttons; per-button `useTransition`; toast on success; `router.refresh()`; Ver detalle→`router.push`; `useMediaQuery("(max-width: 768px)")` swaps to `Sheet`
- [ ] 2.8 [RED] `src/components/calendar/__tests__/booking-calendar-toolbar.test.tsx` — view toggle emits `view` change; "Hoy" emits today's date; professional filter hidden when `role===PROFESSIONAL`; emits `professionalId` change; URL updates via `router.replace` (`?view=...&date=...`)
- [ ] 2.9 [GREEN] `src/components/calendar/booking-calendar-toolbar.tsx` — `"use client"`; view toggle (Semana/Día/Mes); "Hoy" `Button` (resets to current date); professional `Select` (admin/secretary only); URL sync via `router.replace`
- [ ] 2.10 [RED] `src/components/calendar/__tests__/booking-calendar-empty.test.tsx` — view-aware message per `view` prop ("No hay turnos esta semana"/"este día"/"este mes"); "Nuevo turno" CTA links to `/dashboard/bookings/new`; CTA hidden when `role===PROFESSIONAL`
- [ ] 2.11 [GREEN] `src/components/calendar/booking-calendar-empty.tsx` — `"use client"`; view-aware message; "Nuevo turno" `Button` → `/dashboard/bookings/new` (admin/secretary only)
- [ ] 2.12 [RED] `src/app/(dashboard)/dashboard/calendar/__tests__/page.test.tsx` — mock auth+getOrganizationId+getBookings; ADMIN: no `professionalUserId` passed; PROFESSIONAL: `session.user.id` passed; unauthenticated: redirect to `/login`; `searchParams` (`date`, `view`, `professionalId`) parsed and forwarded; viewport ≤768px: wrapper receives default view `day`
- [ ] 2.13 [GREEN] `src/app/(dashboard)/dashboard/calendar/page.tsx` — replace `PlaceholderPage`; Server Component; `await searchParams` (`date`, `view`, `professionalId`); `getOrganizationId`+`auth.api.getSession`; RBAC scoping; `getBookings(orgId, { dateRange, professionalUserId })`; serialize dates→ISO; render `<BookingCalendarToolbar>` + `<BookingCalendar>` + `<BookingCalendarEmpty>`; Suspense around data
- [ ] 2.14 [RED] extend `src/components/calendar/__tests__/booking-calendar.test.tsx` — add cases: `onRangeUpdate` debounced 200ms; mobile viewport (≤768px) default view `day`; month grid shows dot markers only on mobile
- [ ] 2.15 [GREEN] extend `src/components/calendar/booking-calendar.tsx` — debounce `onRangeUpdate` 200ms; `useMediaQuery("(max-width: 768px)")` default view `day`; mobile month-grid renders dot-only via prop
- [ ] 2.16 [VERIFY] `pnpm test` (all green) + `pnpm type-check` (clean) + `pnpm lint` (clean); manual: ADMIN sees all + filter, PROFESSIONAL sees own only, PENDING popover shows Reprogramar, action confirm/cancel/complete/noShow/reschedule refresh calendar, mobile 375px → day view + Sheet, URL shareable, "Hoy" returns to current week
