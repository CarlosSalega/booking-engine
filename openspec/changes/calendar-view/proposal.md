# Proposal: Calendar View

## Intent

Replace the `/dashboard/calendar` placeholder with a real weekly/daily/monthly calendar view over existing bookings. Professionals and secretaries currently navigate a paginated table to understand their schedule — a calendar view provides the spatial/time orientation that booking workflows demand.

## Scope

### In Scope

- **Three views**: Week (`createViewWeek`), Day (`createViewDay`), Month grid (`createViewMonthGrid`)
- **Role-based data scoping**: ADMIN/SECRETARY see all professionals; PROFESSIONAL sees only their own bookings (via `professionalUserId` filter)
- **Event popover**: Click on event → shadcn `Popover` with contextual actions (Confirm, Cancel, Reschedule, View Detail) gated by `canTransition` + role
- **Status color coding**: Map existing `STATUS_TONE_CLASS` → Schedule-X `calendars` config (7 statuses)
- **Argentinian Spanish locale**: `locale: 'es-AR'`, `firstDayOfWeek: 1` (Monday), 24h time, day names Lun/Mar/Mié…
- **Lazy data fetching**: `onRangeUpdate` callback refetches `getBookings` with `dateRange` when user navigates
- **Responsive**: Desktop full calendar, mobile adapts (day view default or compact layout)

### Out of Scope

- Drag & drop rescheduling (requires paid Schedule-X plugin)
- Inline event creation (click empty slot → new booking)
- Resource/professional column view (paid plugin)
- Booking creation/editing forms — reuse existing wizard and detail pages

## Capabilities

### New Capabilities

- `calendar-view`: Interactive calendar with week/day/month views, status-colored events, click-to-action popover, role-based data scoping, and es-AR locale over the existing bookings data layer.

### Modified Capabilities

None — calendar is a pure view over existing `bookings-data` and `bookings-domain` capabilities. No spec-level changes to existing modules.

## Approach

1. **No new module** — calendar reuses `src/modules/bookings/data/` (getBookings with `dateRange` filter) and `src/modules/bookings/actions/` (confirm, cancel, reschedule). It's a VIEW, not a domain.
2. **Server Component page** at `app/(dashboard)/dashboard/calendar/page.tsx` → resolves session/org/RBAC → fetches initial bookings → passes serialized data to Client component.
3. **Client Calendar component** in `src/components/calendar/` wraps `useNextCalendarApp` (Schedule-X SSR-safe hook). Maps `EnrichedBooking[]` → `CalendarEvent[]` using `temporal-polyfill` for date conversion.
4. **Event popover**: `onEventClick` → opens shadcn `Popover` anchored to the event. Actions computed via `getAvailableActions(status, role)` (existing `booking-detail-policy.ts`). Each action calls the corresponding Server Action.
5. **Color mapping**: Extract `STATUS_TONE_CLASS` to a shared constant, map hex colors to Schedule-X `calendars` config (one calendar per status).
6. **Range navigation**: `onRangeUpdate` → server action or API route → refetch `getBookings(orgId, { dateRange })` → update events via `calendar.events.set()`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(dashboard)/dashboard/calendar/page.tsx` | Modified | Replace placeholder with Server Component data fetch |
| `src/components/calendar/` | New | Client components: `BookingCalendar`, `EventPopover`, `calendar-config.ts` |
| `src/modules/bookings/data/booking-data.ts` | Unchanged | `getBookings` with `dateRange` already works |
| `src/modules/bookings/presentation/booking-detail-policy.ts` | Unchanged | `getAvailableActions` reused for popover |
| `src/components/bookings/booking-status-badge.tsx` | Modified | Extract `STATUS_TONE_CLASS` to shared location |
| `package.json` | Modified | Add `@schedule-x/react`, `@schedule-x/calendar`, `temporal-polyfill` |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Schedule-X API surface changes between versions | Low | Pin exact versions, lock file |
| `temporal-polyfill` bundle size impact | Low | Tree-shakeable; only loaded on calendar route |
| Responsive layout complexity across 3 views | Medium | Mobile defaults to day view; test early |
| `onRangeUpdate` causes excessive refetches | Low | Debounce or compare range equality before fetching |

## Rollback Plan

Revert the calendar page to its `PlaceholderPage` import. Remove `src/components/calendar/` directory. Remove Schedule-X dependencies from `package.json`. No database or data-layer changes to undo.

## Dependencies

- `getBookings(orgId, { dateRange })` — already supports date range filtering
- `EnrichedBooking` type — has all fields needed (startTime, endTime, status, professional, patient, service)
- `STATUS_TONE_CLASS` — exists in `booking-status-badge.tsx`, needs extraction
- `getAvailableActions(status, role)` — exists in `booking-detail-policy.ts`
- Server Actions: `confirmBooking`, `cancelBooking`, `rescheduleBooking` — all exist
- Sidebar nav entry "Calendario" → `/dashboard/calendar` — already configured

## Success Criteria

- [ ] Week, Day, and Month views render with booking events positioned correctly by time
- [ ] ADMIN/SECRETARY see all professionals' bookings; PROFESSIONAL sees only their own
- [ ] Click on event opens popover with correct actions for that status + role combination
- [ ] Popover actions (Confirm, Cancel, Reschedule) execute and update the calendar without page navigation
- [ ] All labels, day names, and time formats display in Argentinian Spanish (es-AR)
- [ ] Calendar week starts on Monday
- [ ] Navigating between weeks/months refetches data for the visible range
- [ ] Status colors match the existing booking status badge palette
- [ ] Responsive: usable on mobile viewports (min 375px)
- [ ] `pnpm type-check` and `pnpm lint` pass with zero errors
