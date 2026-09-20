# Proposal: Schedule Management & Calendar Integration

**Change**: `schedules-availability`
**Date**: 2026-08-02
**Artifact store**: OpenSpec
**Review budget**: 400 changed lines
**TDD**: Strict (`pnpm test`)

## Intent

Professionals can't configure weekly availability through the UI — schedules exist only programmatically in the database with no management interface. Admins can't see configured schedules overlaid on the booking calendar. The backend (domain, data, actions, availability calculator) is complete and tested (41 tests passing); this change delivers the UI layer.

## Scope

### In Scope
- `/dashboard/schedule` page: table-based weekly grid editor (one row per day, multiple intervals)
- RBAC: ADMIN manages any professional; PROFESSIONAL self-only (existing backend enforcement)
- Inline overlap validation + toast error feedback on save
- Calendar day/week/month views: schedule intervals rendered as read-only green background blocks

### Out of Scope
- SECRETARY schedule management (future RBAC expansion)
- Exception handling: vacations, holidays, date-specific overrides (future change)
- Audit logging of schedule changes (future change)
- Removing `DEFAULT_WEEKLY_SCHEDULE` fallback (preserved: empty schedule = 08:00–20:00)
- Click-to-create booking from schedule blocks

## Non-Goals

Schedule templates, multi-timezone awareness, public schedule viewing, external calendar sync.

## Capabilities

### New Capabilities
- `schedules-management`: Weekly schedule editor at `/dashboard/schedule`. Table-based grid with add/remove intervals per day, inline overlap validation, save via existing `updateSchedule` action. ADMIN scopes across professionals; PROFESSIONAL self-scoped.

### Modified Capabilities
- `calendar-view`: Schedule intervals rendered as read-only background blocks (green = within configured schedule). No interaction — pure visual overlay. Applies to day, week, and month views.

## Approach

**Reuse 100% of existing backend.** Two PR slices fitting the 400-line budget:

1. **Slice 1 — Schedule editor** (~300–400 lines): `src/app/dashboard/schedule/page.tsx`, `src/modules/schedules/presentation/` components and tests. TDD: test editor render → interval CRUD → save wiring to `updateSchedule`.
2. **Slice 2 — Calendar schedule blocks** (~200–300 lines): Modify `src/components/calendar/booking-calendar.tsx`, new `schedule-block.tsx`, tests. TDD: test block rendering across views → empty state (no configured schedule).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/dashboard/schedule/` | New | Route + server component page |
| `src/modules/schedules/presentation/` | New | Editor components, form logic, tests |
| `src/components/calendar/` | Modified | Schedule block overlay in existing calendar |
| Backend (domain/data/actions/availability) | None | Reused as-is, no changes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Schedule overlay degrades calendar render perf | Low | Memoize blocks; fetch per visible range only |
| Multi-interval-per-day UX confusion | Medium | Inline overlap errors + clear "Add interval" CTA per day row |
| Atomic replace race on rapid save | Low | Backend already transactional; UI disables save during pending request |

## Rollback Plan

Revert commits per slice. No database migrations in this change. Calendar: remove schedule block import — returns to booking-only view. Schedule page: delete route directory.

## Dependencies

- `ProfessionalScheduleInterval` model (migrated, uncommitted)
- `updateSchedule` / `getSchedule` server actions (implemented, tested)
- `calculateAvailableSlots` from availability module (implemented, tested)
- `booking-calendar.tsx` component (exists, functional)

## Success Criteria

- [ ] ADMIN adds/removes intervals for any professional via `/dashboard/schedule`
- [ ] PROFESSIONAL edits only their own schedule (RBAC enforcement)
- [ ] Overlapping intervals show inline validation error before save
- [ ] Calendar day/week/month views display schedule blocks as green background
- [ ] `pnpm test` passes; no regressions in booking creation/enforcement
- [ ] Slice 1 PR: max 400 changed lines; Slice 2 PR: max 300 changed lines

## Deferred Decisions

| Decision | Status |
|----------|--------|
| SECRETARY schedule management | Future RBAC expansion |
| No-schedule = no-availability (remove fallback) | Future behavioral change |
| Audit logging (`ScheduleAuditLog`) | Future change |
| Exception handling (vacations/holidays) | Separate change per DOMAIN.md |
