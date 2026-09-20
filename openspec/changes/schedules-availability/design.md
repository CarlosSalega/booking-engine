# Design: Schedule Management & Calendar Integration

## Technical Approach

Two independent PR slices, both reusing 100% of the existing backend (domain/data/actions/availability). Slice 1 delivers the `/dashboard/schedule` editor; Slice 2 overlays green schedule blocks on the existing calendar via Schedule-X `backgroundEvents`. No migrations, no backend changes.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Editor pattern | Table-based vs calendar-drag vs form-list | Table aligns with exploration reco, shadcn Table, simpler to test and make responsive | **Table-based** (one row per day, multiple interval groups per row) |
| Calendar overlay | Schedule-X `backgroundEvents` vs custom CSS layer | `backgroundEvents` is native, non-interactive by contract, time-aligned automatically; CSS layer duplicates time math | **`backgroundEvents`** API |
| State management | `useState` + `useTransition` vs Zustand | Form is ephemeral (edit → save → done). No cross-component sharing. BookingsTab pattern already proven in this codebase | **`useState` + `useTransition`** |
| Schedule fetch in calendar | Fetch alongside bookings in RSC page vs separate client call | RSC fetch keeps page a pure Server Component, schedule blocks stream with Suspense; client call adds waterfall | **RSC fetch** — `getSchedule` called in `CalendarDataWrapper` |
| Professional selector for ADMIN | Reuse toolbar filter vs dedicated component | Editor needs own selection (independent of calendar scope); toolbar filter is calendar-only | **Dedicated `<Select>`** in editor, same `getProfessionalsForService` query pattern |
| `DEFAULT_WEEKLY_SCHEDULE` behavior | Preserve vs remove | Removing the fallback is a behavioral change (out of scope). Empty configured schedule = fallback applied only in availability calc, not in calendar overlay | **Preserve** — unchanged |

## Data Flow

```
┌─ Schedule Editor (Slice 1) ──────────────────────────┐
│                                                         │
│  RSC page (auth gate / org)                             │
│    └─> Suspense (skeleton)                              │
│        └─> ScheduleDataWrapper (async RSC)              │
│            ├─ getSchedule(orgId, professionalId) ───────┤──> DB
│            └─> ScheduleEditor (Client)                  │
│                ├─ DayRow × 7  (intervals per day)       │
│                ├─ Inline overlap validation (domain fn) │
│                └─ Save → updateSchedule() ──────────────┤──> DB (atomic replace)
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─ Calendar Overlay (Slice 2) ───────────────────────────┐
│                                                         │
│  CalendarPage (existing RSC)                            │
│    └─> CalendarDataWrapper (modified)                   │
│        ├─ getBookings(range) ──────── (existing)        │
│        ├─ getSchedule(orgId, profId) ── (NEW) ──────────┤──> DB
│        └─> BookingCalendarDataWrapper (modified)        │
│            └─> BookingCalendar (modified)               │
│                ├─ events: bookings      (existing)      │
│                └─ backgroundEvents:     (NEW)           │
│                    schedule intervals → green blocks    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/(dashboard)/dashboard/schedule/page.tsx` | Create | RSC entry: auth gate, org resolve, Suspense + skeleton |
| `src/modules/schedules/presentation/schedule-editor.tsx` | Create | Table-based weekly grid editor (Client). Professional select, per-day intervals, inline overlap errors, save via `useState + useTransition` (calls `updateSchedule`, then `router.refresh()`) |
| `src/modules/schedules/presentation/__tests__/schedule-editor.test.tsx` | Create | TDD: render, add/remove interval, overlap validation, save success/failure, RBAC |
| `src/components/dashboard/sidebar.tsx` | Modify | Add "Horarios" nav item (icon: `Clock`) under "Operación", roles: ADMIN + PROFESSIONAL |
| `src/components/calendar/booking-calendar.tsx` | Modify | Accept optional `schedule` prop; pass to Schedule-X `backgroundEvents` config |
| `src/components/calendar/booking-calendar-data-wrapper.tsx` | Modify | Accept `schedule` prop, forward to `BookingCalendar` |
| `src/app/(dashboard)/dashboard/calendar/page.tsx` | Modify | `CalendarDataWrapper` calls `getSchedule` alongside `getBookings`; passes serialized intervals |
| `src/components/calendar/__tests__/booking-calendar.test.tsx` | Modify | Add schedule overlay rendering, empty-schedule, non-interactive assertions |

## Interfaces / Contracts

**ScheduleEditor props** (Client):
```typescript
interface ScheduleEditorProps {
  professionalId: string;
  initialIntervals: WeeklyScheduleInterval[];
  professionals?: { id: string; user: { name: string } }[]; // ADMIN only
}
```

**BookingCalendar new prop**:
```typescript
schedule?: WeeklyScheduleInterval[]; // backgroundEvents source
```

**Background event shape** (mapped from `WeeklyScheduleInterval` → Schedule-X background event):
```typescript
{ id: `${day}-${start}-${end}`, start: ZonedDateTime, end: ZonedDateTime, style: { backgroundColor: "var(--color-green-200)" } }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (Slice 1) | Overlap detection, interval add/remove logic, form validation | Mock `updateSchedule`/`getSchedule`; verify state mutations, error rendering |
| Unit (Slice 2) | Schedule block rendering across day/week/month, empty state, non-interactive contract | Mock `BookingCalendar`; assert backgroundEvents array shape, green styling, no `onEventClick` |
| Integration | Save → success toast → router.refresh cycle | `useTransition` + mock router; assert toast and refresh called after action resolves |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR, executable-file classification, or process-integration boundary.

## Migration / Rollout

No database migrations. Rollback per slice: revert calendar page changes (removes overlay), delete schedule route directory (removes editor). Sidebar nav item removed on editor slice revert.

## Open Questions

None — all architectural decisions confirmed by specs. ADMIN calendar schedule overlay scopes to toolbar's professional filter (calendar-view spec: "Range or professional changes"). PROFESSIONAL editor shows no professional selector (schedules-management spec: "only the professional's schedule is available").
