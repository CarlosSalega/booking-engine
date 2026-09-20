# Exploration: Schedules & Availability

**Change name**: `schedules-availability`  
**Date**: 2026-08-02  
**Status**: Exploration complete — ready for proposal  
**Artifact store**: OpenSpec  
**Review budget**: 400 changed lines  
**TDD**: Strict (RED → GREEN → REFACTOR)

---

## Executive Summary

The codebase already contains a **solid foundation** for schedules and availability:

- ✅ **Database**: `ProfessionalScheduleInterval` model with migration, constraints, and indexes
- ✅ **Domain**: Pure validation logic (`WeeklyScheduleInterval`, overlap detection)
- ✅ **Data layer**: `getProfessionalSchedule`, `replaceProfessionalSchedule` (atomic replace)
- ✅ **Actions**: `getSchedule`, `updateSchedule` with RBAC (ADMIN/PROFESSIONAL)
- ✅ **Availability calculator**: `calculateAvailableSlots`, `isSlotWithinSchedule`
- ✅ **Integration**: `create-booking` and `reschedule-booking` enforce schedule constraints
- ✅ **Tests**: 41 tests passing across domain/data/actions layers

**What's missing**: UI for schedule management, exception handling (vacations/holidays), and calendar integration.

**Recommendation**: The existing implementation is **reusable and architecturally sound**. The SDD change should focus on:
1. Schedule management UI (weekly grid editor)
2. Exception support (date-specific overrides)
3. Calendar visualization of schedules vs. bookings
4. Settings integration (buffer time, default schedule templates)

---

## Current State

### Database Layer (✅ Complete)

**Model**: `ProfessionalScheduleInterval`
- Fields: `professionalId`, `dayOfWeek` (0-6), `startMinute` (0-1439), `endMinute` (1-1440)
- Constraints: `startMinute < endMinute`, day/min ranges enforced via CHECK
- Unique: `(professionalId, dayOfWeek, startMinute, endMinute)`
- Indexes: `organizationId`, `(professionalId, dayOfWeek, startMinute)`
- Cascade delete on professional deletion

**Migration**: `20260802160000_add_professional_schedule_intervals` — applied, not committed.

### Domain Layer (✅ Complete)

**Location**: `src/modules/schedules/domain/`

**Types**:
```typescript
interface WeeklyScheduleInterval {
  dayOfWeek: number;      // 0-6 (Sunday-Saturday)
  startMinute: number;    // 0-1439
  endMinute: number;      // 1-1440
}
```

**Validation**:
- `isValidDayOfWeek(day)` — integer 0-6
- `isValidMinute(minute)` — integer 0-1440
- `isValidWeeklyScheduleInterval(interval)` — start < end, valid ranges
- `isOverlappingWeeklyScheduleIntervals(a, b)` — same day, overlapping ranges
- `hasOverlappingWeeklyScheduleIntervals(intervals[])` — batch overlap check

**Zod schema**: `weeklyScheduleIntervalSchema` — strict mode, cross-field validation via `superRefine`.

**Tests**: 187 lines, covers boundaries, overlaps, schema validation.

### Data Layer (✅ Complete)

**Location**: `src/modules/schedules/data/schedule-data.ts`

**Functions**:
- `getProfessionalSchedule(orgId, professionalId)` — returns sorted intervals
- `replaceProfessionalSchedule(orgId, professionalId, intervals[])` — atomic delete+create in transaction
  - Validates each interval with Zod schema
  - Checks for overlaps before opening transaction
  - Verifies professional exists in org scope
  - Throws `ScheduleValidationError` on validation failure

**Tests**: 61 lines, mocks Prisma transaction, verifies atomicity and validation.

### Actions Layer (✅ Complete)

**Location**: `src/modules/schedules/actions/`

**Server Actions**:
- `getSchedule({ professionalId })` — RBAC: blocks PATIENT, PROFESSIONAL can only read own
- `updateSchedule({ professionalId, intervals })` — RBAC: ADMIN/PROFESSIONAL, PROFESSIONAL restricted to own
  - Revalidates `/dashboard/schedule`, `/dashboard/calendar`, `/dashboard/bookings`

**Types**: `ScheduleResult<T>`, `ScheduleSuccess<T>`, `ScheduleError`, input types inferred from Zod schemas.

**Tests**: 69 lines, mocks auth/org/revalidatePath, verifies RBAC and revalidation.

### Availability Module (✅ Complete)

**Location**: `src/modules/availability/`

**Purpose**: Pure calculation, no persistence. Answers:
1. "Is this [start, end) range within the professional's schedule?"
2. "What slots are available on this date for this service duration?"

**Functions**:
- `isSlotWithinSchedule(schedule, startTime, endTime)` — checks if a booking fits in any interval
- `calculateAvailableSlots(schedule, date, durationMinutes, reservations[], rules?)` — generates available slots
  - Filters schedule by `date.getDay()`
  - Iterates intervals, generates slots at `step` increments (default 30min)
  - Excludes slots overlapping with reservations (half-open semantics)
  - Applies `bufferMinutes` around reservations

**Constants**:
- `DEFAULT_WEEKLY_SCHEDULE` — fallback: 08:00-20:00 every day (used when professional has no configured schedule)
- `AvailabilityRules` — `{ slotStepMinutes?, bufferMinutes? }`

**Tests**: 51 lines, covers slot generation, overlap exclusion, buffer application.

### Bookings Integration (✅ Complete)

**Changes**:
- `booking-availability.ts` refactored to use `calculateAvailableSlots` and `getProfessionalSchedule`
  - Reads configured schedule; falls back to `DEFAULT_WEEKLY_SCHEDULE` if empty
  - Reads `bufferMinutes` from `OrganizationSettings`
  - Fixed overlap query: `startTime < dayEnd AND endTime > dayStart` (was `gte/lte`, now strict)
- `create-booking.action.ts` — inside transaction:
  - Loads `professionalScheduleInterval` for the professional
  - If schedule exists, calls `isSlotWithinSchedule(schedule, startTime, endTime)`
  - Throws `OutsideScheduleError` if booking is outside schedule → user error: "El horario está fuera de la disponibilidad del profesional"
- `reschedule-booking.action.ts` — same schedule check inside transaction

**Tests**: Updated to mock `professionalScheduleInterval.findMany` and verify schedule enforcement.

### Calendar Component (⚠️ Partial)

**Location**: `src/components/calendar/`

**Current state**: Functional calendar UI for **viewing bookings** (day/week/month views), but:
- Does NOT display professional schedules (available slots)
- Does NOT provide schedule editing UI
- Route `/dashboard/calendar` exists, but `/dashboard/schedule` does not

**Files**: `booking-calendar.tsx`, toolbar, event renderers, data wrapper, utils, CSS.

### Settings Integration (⚠️ Partial)

**Model**: `OrganizationSettings` has `bufferMinutes` (default 0), `defaultDurationMinutes` (default 30).

**Usage**: `booking-availability.ts` reads `bufferMinutes` for slot calculation.

**Missing**: UI to configure `bufferMinutes`, no default schedule template support.

---

## Affected Areas

### Already Implemented (No Changes Needed)

- `prisma/schema.prisma` — `ProfessionalScheduleInterval` model ✅
- `prisma/migrations/20260802160000_add_professional_schedule_intervals/` ✅
- `src/modules/schedules/domain/` — types, validation, schema ✅
- `src/modules/schedules/data/` — get/replace functions ✅
- `src/modules/schedules/actions/` — get/update actions ✅
- `src/modules/availability/` — pure calculation ✅
- `src/modules/bookings/data/booking-availability.ts` — integration ✅
- `src/modules/bookings/actions/create-booking.action.ts` — schedule enforcement ✅
- `src/modules/bookings/actions/reschedule-booking.action.ts` — schedule enforcement ✅
- All corresponding tests ✅

### To Be Implemented (SDD Change Scope)

1. **Schedule Management UI**
   - `src/app/dashboard/schedule/page.tsx` — route
   - `src/modules/schedules/presentation/` — weekly grid editor component
   - Form to add/edit/remove intervals per day
   - Visual feedback for overlaps, validation errors

2. **Exception Handling** (Future — out of scope for MVP)
   - `ProfessionalScheduleException` model (specific dates, vacations, holidays)
   - Domain logic to override weekly schedule for specific dates
   - UI for managing exceptions

3. **Calendar Integration**
   - Display schedule intervals as background blocks in calendar
   - Differentiate "available slots" vs. "booked slots"
   - Click-to-create booking from available slot

4. **Settings UI**
   - Form to configure `bufferMinutes`, `defaultDurationMinutes`
   - Default schedule template (copy to new professionals)

---

## Approaches

### Approach 1: Incremental UI Layer (Recommended)

**Description**: Keep the existing backend implementation. Add UI for schedule management and calendar integration in slices.

**Scope**:
- Slice 1: Schedule management page (weekly grid editor)
- Slice 2: Calendar visualization of schedules
- Slice 3: Settings UI for buffer time
- Slice 4 (Future): Exception handling

**Pros**:
- ✅ Reuses 100% of existing backend code
- ✅ Low risk — backend is tested and working
- ✅ Fits within 400-line budget per slice
- ✅ TDD-friendly — UI tests can mock existing actions

**Cons**:
- ⚠️ No exception support in MVP (acceptable per DOMAIN.md: "Future feature")
- ⚠️ `DEFAULT_WEEKLY_SCHEDULE` is hardcoded (minor — can be moved to settings later)

**Effort**: Medium (3-4 slices, each 200-400 lines)

### Approach 2: Full Rewrite with Exception Support

**Description**: Redesign the schema to support exceptions from the start. Add `ProfessionalScheduleException` model, update domain/data/actions, build UI.

**Scope**:
- Schema migration for exceptions
- Domain logic for exception priority (vacations > weekly schedule)
- UI for both weekly schedule and exceptions
- Calendar integration

**Pros**:
- ✅ Complete feature set (weekly + exceptions)
- ✅ Aligns with DOMAIN.md vision ("Exceptions override weekly schedules")

**Cons**:
- ❌ Discards working implementation
- ❌ Exceeds 400-line budget significantly
- ❌ Higher risk — untested schema changes
- ❌ Exceptions are marked as "Future" in DOMAIN.md

**Effort**: High (800+ lines, multiple migrations)

### Approach 3: Hybrid — UI + Minimal Exception Stub

**Description**: Add UI for weekly schedule. Create a stub for exceptions (database model + domain type, but no UI). Document the extension point.

**Scope**:
- Schedule management UI
- `ProfessionalScheduleException` model (no UI)
- Domain type for exceptions (no calculation logic)
- Calendar visualization

**Pros**:
- ✅ Delivers usable UI
- ✅ Prepares architecture for exceptions
- ✅ Moderate effort

**Cons**:
- ⚠️ Dead code (exception model with no UI)
- ⚠️ Still exceeds 400-line budget

**Effort**: Medium-High (500-600 lines)

---

## Recommendation

**Approach 1: Incremental UI Layer**

**Rationale**:
1. The backend is **complete, tested, and architecturally sound**. Rewriting it would be wasteful.
2. DOMAIN.md explicitly marks exceptions as "Future feature" — MVP should not include them.
3. The 400-line budget per slice is realistic for UI work.
4. TDD is strict — UI tests can mock the existing actions without changes.
5. The `DEFAULT_WEEKLY_SCHEDULE` hardcoded fallback is acceptable for MVP. It can be moved to settings in a later change if needed.

**Implementation order**:
1. **Slice 1**: Schedule management page (weekly grid editor) — highest value, unlocks the feature
2. **Slice 2**: Calendar integration (display schedules as background blocks)
3. **Slice 3**: Settings UI (buffer time, default duration)
4. **Slice 4 (Future)**: Exception handling (when product priority shifts)

---

## Risks

### Risk 1: No Exception Support in MVP

**Severity**: Low  
**Mitigation**: DOMAIN.md marks exceptions as "Future". The architecture supports adding them later without breaking changes (new model, new domain functions, UI extension).

### Risk 2: Hardcoded `DEFAULT_WEEKLY_SCHEDULE`

**Severity**: Low  
**Mitigation**: The fallback is explicit and documented. If product requires configurable defaults, a later change can move it to `OrganizationSettings` without breaking the API.

### Risk 3: Calendar Integration Complexity

**Severity**: Medium  
**Mitigation**: The calendar component already exists. Integration can be incremental: first display schedules as read-only blocks, then add click-to-create booking in a later slice.

### Risk 4: Buffer Time Configuration

**Severity**: Low  
**Mitigation**: `bufferMinutes` is already in `OrganizationSettings` and used by `calculateAvailableSlots`. UI to configure it is straightforward.

---

## Open Decisions

### Decision 1: Schedule Editor UI Pattern

**Options**:
- **Option A**: Table-based (one row per day, add/remove intervals inline)
- **Option B**: Visual grid (drag to create intervals, like Google Calendar)
- **Option C**: Form-based (select day, start time, end time, add to list)

**Recommendation**: **Option A** (table-based) for MVP. Simpler to implement, easier to test, aligns with existing shadcn/ui Table component. Visual grid can be added later if needed.

### Decision 2: Schedule Validation Feedback

**Options**:
- **Option A**: Inline validation (red border on conflicting intervals)
- **Option B**: Toast notification on save failure
- **Option C**: Both (inline for overlaps, toast for other errors)

**Recommendation**: **Option C**. Inline validation for overlaps (immediate feedback), toast for server errors (network, auth).

### Decision 3: Calendar Schedule Display

**Options**:
- **Option A**: Read-only background blocks (green = available, gray = outside schedule)
- **Option B**: Click-to-create booking from available slot
- **Option C**: Both (A first, B later)

**Recommendation**: **Option C**. Read-only display first (Slice 2), click-to-create in a later slice (requires wizard integration).

---

## Business Rules

### Rule 1: Schedule Intervals Cannot Overlap

**Source**: `src/modules/schedules/domain/weekly-schedule-interval.ts`  
**Enforcement**: `hasOverlappingWeeklyScheduleIntervals()` — checked before opening transaction.  
**User feedback**: "Los intervalos no pueden superponerse" (toast).

### Rule 2: Bookings Must Fit Within Schedule

**Source**: `src/modules/bookings/actions/create-booking.action.ts`  
**Enforcement**: `isSlotWithinSchedule(schedule, startTime, endTime)` — checked inside transaction.  
**User feedback**: "El horario está fuera de la disponibilidad del profesional" (toast).

### Rule 3: Empty Schedule Falls Back to Default

**Source**: `src/modules/bookings/data/booking-availability.ts`  
**Logic**: If `getProfessionalSchedule()` returns `[]`, use `DEFAULT_WEEKLY_SCHEDULE` (08:00-20:00 every day).  
**Rationale**: Professionals without configured schedules can still accept bookings during business hours.

### Rule 4: RBAC for Schedule Management

**Source**: `src/modules/schedules/actions/`  
**Rules**:
- ADMIN: can manage any professional's schedule
- PROFESSIONAL: can only manage their own schedule
- PATIENT: cannot access schedule management

### Rule 5: Atomic Schedule Replacement

**Source**: `src/modules/schedules/data/schedule-data.ts`  
**Logic**: `replaceProfessionalSchedule()` deletes all existing intervals and creates new ones in a single transaction.  
**Rationale**: Simpler than diff-based updates, avoids partial state.

---

## Non-Goals

1. **Exception handling** (vacations, holidays, specific date overrides) — deferred to future change
2. **Schedule templates** (copy schedule across professionals) — deferred
3. **Recurring exceptions** (e.g., "every first Monday of the month") — deferred
4. **Multi-timezone support** — out of scope (MVP is single-timezone)
5. **Public schedule viewing** (patient sees professional's availability) — deferred
6. **Schedule synchronization** (Google Calendar, Outlook) — deferred

---

## Slices

### Slice 1: Schedule Management Page

**Goal**: Allow ADMIN/PROFESSIONAL to configure weekly schedule.

**Files**:
- `src/app/dashboard/schedule/page.tsx` — route
- `src/modules/schedules/presentation/schedule-editor.tsx` — weekly grid editor
- `src/modules/schedules/presentation/schedule-editor-form.tsx` — form logic
- `src/modules/schedules/presentation/__tests__/schedule-editor.test.tsx` — tests

**Estimated size**: 300-400 lines

**TDD approach**:
1. RED: Write tests for schedule editor (render, add interval, remove interval, save)
2. GREEN: Implement editor component, wire to `updateSchedule` action
3. REFACTOR: Extract sub-components, optimize re-renders

### Slice 2: Calendar Schedule Visualization

**Goal**: Display professional schedules as background blocks in calendar.

**Files**:
- `src/components/calendar/booking-calendar.tsx` — add schedule layer
- `src/components/calendar/schedule-block.tsx` — render schedule intervals
- `src/components/calendar/__tests__/schedule-block.test.tsx` — tests

**Estimated size**: 200-300 lines

**TDD approach**:
1. RED: Write tests for schedule block rendering
2. GREEN: Implement schedule block component, integrate with calendar
3. REFACTOR: Optimize rendering performance

### Slice 3: Settings UI

**Goal**: Allow ADMIN to configure buffer time and default duration.

**Files**:
- `src/app/dashboard/settings/page.tsx` — update existing page
- `src/modules/settings/presentation/booking-settings-form.tsx` — form
- `src/modules/settings/presentation/__tests__/booking-settings-form.test.tsx` — tests

**Estimated size**: 200-300 lines

**TDD approach**:
1. RED: Write tests for settings form
2. GREEN: Implement form, wire to settings actions
3. REFACTOR: Extract validation logic

### Slice 4 (Future): Exception Handling

**Goal**: Support date-specific schedule overrides.

**Files**:
- `prisma/schema.prisma` — add `ProfessionalScheduleException` model
- `prisma/migrations/YYYYMMDDHHMMSS_add_professional_schedule_exceptions/`
- `src/modules/schedules/domain/schedule-exception.ts`
- `src/modules/schedules/data/schedule-exception-data.ts`
- `src/modules/schedules/actions/schedule-exception-actions.ts`
- `src/modules/schedules/presentation/exception-editor.tsx`

**Estimated size**: 600-800 lines (separate change)

---

## Ready for Proposal

**Status**: ✅ Yes

**Next steps**:
1. Orchestrator should present this exploration to the user
2. User confirms scope (Slices 1-3 for MVP, Slice 4 deferred)
3. Orchestrator launches `sdd-propose` to create `proposal.md`
4. Proposal should reference this exploration and specify which slices are in scope

**What to tell the user**:
> "The backend for schedules and availability is already implemented and tested. The SDD change should focus on the UI layer: schedule management page, calendar integration, and settings. Exception handling (vacations, holidays) is deferred to a future change per the product spec. Do you want to proceed with Slices 1-3 (schedule editor, calendar visualization, settings UI)?"

---

## Appendix: Test Coverage Summary

| Module | Tests | Lines | Status |
|--------|-------|-------|--------|
| `schedules/domain` | 187 | ✅ Passing |
| `schedules/data` | 61 | ✅ Passing |
| `schedules/actions` | 69 | ✅ Passing |
| `availability` | 51 | ✅ Passing |
| `bookings/data/booking-availability` | 258 | ✅ Passing |
| `bookings/actions/create-booking` | 302 | ✅ Passing |
| `bookings/actions/reschedule-booking` | 300 | ✅ Passing |
| **Total** | **1228** | **✅ All passing** |

---

## Appendix: File Inventory

### New Files (Uncommitted)

```
prisma/migrations/20260802160000_add_professional_schedule_intervals/
  migration.sql (34 lines)

src/modules/schedules/
  domain/
    weekly-schedule-interval.ts (64 lines)
    weekly-schedule-interval.schema.ts (38 lines)
    index.ts (2 lines)
    __tests__/weekly-schedule-interval.test.ts (187 lines)
  data/
    schedule-data.ts (80 lines)
    schedule-data.types.ts (3 lines)
    __tests__/schedule-data.test.ts (61 lines)
  actions/
    get-professional-schedule.action.ts (43 lines)
    replace-professional-schedule.action.ts (69 lines)
    schedule-actions.schema.ts (12 lines)
    schedule-actions.types.ts (19 lines)
    index.ts (9 lines)
    __tests__/schedule-actions.test.ts (69 lines)

src/modules/availability/
  availability.ts (83 lines)
  index.ts (1 line)
  __tests__/availability.test.ts (51 lines)
```

### Modified Files (Uncommitted)

```
prisma/schema.prisma (+21 lines)
src/modules/bookings/data/booking-availability.ts (+60/-40 lines)
src/modules/bookings/data/__tests__/booking-availability.test.ts (+18 lines)
src/modules/bookings/actions/create-booking.action.ts (+24 lines)
src/modules/bookings/actions/__tests__/create-booking.test.ts (+4 lines)
src/modules/bookings/actions/reschedule-booking.action.ts (+24 lines)
src/modules/bookings/actions/__tests__/reschedule-booking.test.ts (+4 lines)
```

**Total new code**: ~700 lines  
**Total modified code**: ~120 lines  
**Total test coverage**: ~600 lines
