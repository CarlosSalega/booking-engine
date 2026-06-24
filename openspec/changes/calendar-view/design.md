# Design: Calendar View

## Technical Approach

Server Component page resolves session/org/RBAC, fetches bookings via existing `getBookings(orgId, { dateRange, professionalUserId? })`, serializes `EnrichedBooking[]` as ISO strings, and passes to a Client `BookingCalendar` wrapper. The wrapper calls `useNextCalendarApp` (Schedule-X), mapping bookings to events via `bookingToCalendarEvent()`. Status colors use a `calendars` config (one per status, 7 entries). `onRangeUpdate` → Server Action refetch → `router.refresh()` loads next range. `onEventClick` opens a shadcn `Popover` whose actions are gated by `getAvailableActions(status, role)` and wired to existing Server Actions (`confirmBooking`, `cancelBooking`, etc.).

## Architecture Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| AD1 | No new module — calendar reuses `src/modules/bookings/` data + actions | Calendar is a pure presentation view; zero new domain logic. `getBookings`, `canTransition`, server actions already exist. |
| AD2 | Server Component page + `"use client"` wrapper pattern | Mirrors existing `BookingsPage` → `BookingTable` pattern. Session/org/RBAC resolved server-side; interactive calendar runs client-side. |
| AD3 | URI-driven state: `?date=YYYY-MM-DD&view=week|day|month&professionalId=uuid` | Enables shareable/bookmarkable views. Mirrors how `bookings/page.tsx` uses `searchParams` for filters. Client updates via `router.replace()`. |
| AD4 | Popover actions reuse `getAvailableActions` + existing Server Actions | Zero new action logic. Popover mirrors `BookingDetailActions` pattern: useTransition → server action → toast + refresh. |
| AD5 | Serialization: ISO strings across RSC boundary; `Temporal.ZonedDateTime` in client | Avoids silent `Date`-to-string coercion bugs. Temporal API for all client date math (start/end positioning, range calculation). |
| AD6 | Schedule-X `calendars` config per status for colors (not CSS classes) | Schedule-X renders events via calendar config properties (`backgroundColor`, `borderColor`). Maps `STATUS_TONE_CLASS` tones → hex equivalents. |
| AD7 | `onRangeUpdate` triggers Server Action refetch; no REST endpoint | Keep data access server-only. Range change calls a server action that returns `EnrichedBooking[]`; calendar updates via `calendar.events.set()`. |

## Data Flow

```
Server Component (page.tsx)
  │ auth.api.getSession() → role, userId
  │ getOrganizationId() → orgId
  │ getBookings(orgId, { dateRange, professionalUserId? }) → EnrichedBooking[]
  │ serialize dates → ISO strings
  ▼
Client BookingCalendar ("use client")
  │ bookingToCalendarEvent() → CalendarEvent[]
  │ calendars config → status colors
  │ useNextCalendarApp({ events, calendars, views, callbacks })
  ├─ onRangeUpdate(newRange) → serverAction(orgId, newRange) → calendar.events.set()
  └─ onEventClick(event, clickEvent) → setPopoverState({ event, x, y })
      │
      ▼
  BookingCalendarPopover
    │ getAvailableActions(status, role) → visible actions
    │ useTransition() → action(bookingId) → toast + router.refresh()
    └─ "Ver detalle" → router.push(/dashboard/bookings/${id})
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/(dashboard)/dashboard/calendar/page.tsx` | Modify | Replace placeholder; Server Component with session/org/RBAC + `getBookings` |
| `src/components/calendar/booking-calendar.tsx` | Create | Client wrapper: `useNextCalendarApp`, view state, event callbacks |
| `src/components/calendar/booking-calendar-event.tsx` | Create | Custom `timeGridEvent` component for week/day views |
| `src/components/calendar/booking-calendar-month-event.tsx` | Create | Custom `monthGridEvent` with dot + count |
| `src/components/calendar/booking-calendar-popover.tsx` | Create | shadcn `Popover`: patient, service, time, actions gated by policy |
| `src/components/calendar/booking-calendar-toolbar.tsx` | Create | View toggle, "Hoy" button, professional filter (`Select`) |
| `src/components/calendar/booking-calendar-empty.tsx` | Create | Empty state: "No hay turnos esta semana/día/mes" |
| `src/components/calendar/booking-calendar-utils.ts` | Create | `bookingToCalendarEvent()`, color mapping, date range calc |
| `package.json` | Modify | Add `@schedule-x/react`, `@schedule-x/calendar`, `@schedule-x/theme-default`, `temporal-polyfill` |
| `src/components/ui/popover.tsx` | Create | Add shadcn Popover component (`pnpm dlx shadcn@canary add popover`) |
| `src/components/ui/select.tsx` | Create | Add shadcn Select component for professional filter |

## Interfaces / Contracts

```typescript
// booking-calendar-utils.ts — pure, no React
interface CalendarEventInput {
  booking: EnrichedBooking; // dates are ISO strings after serialization
}

function bookingToCalendarEvent(input: CalendarEventInput): CalendarAppEvent {
  return {
    id: input.booking.id,
    title: input.booking.patient?.user.name ?? "Invitado",
    start: Temporal.ZonedDateTime.from(input.booking.startTime, tzArg).toISOString(),
    end: Temporal.ZonedDateTime.from(input.booking.endTime, tzArg).toISOString(),
    calendarId: input.booking.status, // status = calendar ID
    _booking: input.booking,          // preserve full data for popover
  };
}

// calendars config — 7 entries, one per BookingStatus
const STATUS_CALENDAR_COLORS: Record<BookingStatusType, { backgroundColor: string; borderColor: string }> = {
  PENDING: { backgroundColor: "hsl(48 96% 53% / 0.15)", borderColor: "hsl(48 96% 53% / 0.3)" },
  CONFIRMED: { backgroundColor: "hsl(160 84% 39% / 0.15)", borderColor: "hsl(160 84% 39% / 0.3)" },
  // ... 5 more
};
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `bookingToCalendarEvent` mapping, color config, date range calc | Pure function tests in `booking-calendar-utils.test.ts` (vitest) |
| Unit | `getAvailableActions` integration in popover context | Mock `getAvailableActions`; assert button visibility per status+role in `booking-calendar-popover.test.tsx` |
| Integration | Calendar wrapper renders, view switching, event rendering | `booking-calendar.test.tsx`: mock `useNextCalendarApp`, assert child render props |
| Integration | RBAC scoping: PROFESSIONAL sees own only; ADMIN sees all | Test page with mocked session, assert `getBookings` filters |

## Migration / Rollout

No migration required. Rollback: revert `page.tsx` to placeholder, remove `src/components/calendar/`, remove Schedule-X + temporal-polyfill from `package.json`.

## Open Questions

- [ ] Schedule-X version pinning: `@schedule-x/react` latest stable vs. specific version for lockfile stability
- [ ] Temporal polyfill bundle size: confirm tree-shaking with `next build` analyzer before merging
- [ ] Mobile popover → `Sheet`/`Dialog` adapter: spec requires bottom sheet at ≤768px; decide whether to use `Sheet` or `Dialog` fallback
