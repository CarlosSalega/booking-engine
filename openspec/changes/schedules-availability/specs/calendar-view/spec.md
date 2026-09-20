# Delta for Calendar View

## ADDED Requirements

### Requirement: Schedule background overlay

Calendar day, week, and month views MUST render each configured weekly schedule interval for the visible professional as a read-only green background block. Blocks SHALL be visual context only: they MUST NOT create bookings, open booking actions, or obscure booking events. The overlay MUST use the existing calendar range/professional scope and schedule interval contract (`professionalId`, `dayOfWeek`, `startMinute`, `endMinute`).

#### Scenario: Configured intervals render
- GIVEN a visible range and a professional with two intervals on a visible weekday
- WHEN day, week, or month view renders
- THEN both intervals appear as green background blocks aligned to their day and times

#### Scenario: No configured schedule
- GIVEN the schedule query returns no intervals
- WHEN the calendar renders
- THEN no schedule blocks are shown and the existing booking calendar remains usable
- AND booking availability continues using the existing `DEFAULT_WEEKLY_SCHEDULE` fallback

#### Scenario: Overlay is non-interactive
- GIVEN a user clicks or focuses a schedule block
- WHEN the interaction occurs
- THEN no booking creation or booking transition action starts
- AND booking event interaction remains available

### Requirement: Schedule loading and failure contract

The calendar MUST request schedule data for the same organization, professional scope, and visible range used by the existing calendar. A schedule loading state SHOULD avoid misleading partial blocks. If schedule retrieval fails, the calendar MUST retain bookings, announce a non-blocking error, and remain navigable.

#### Scenario: Range or professional changes
- GIVEN the user changes date range, view, or ADMIN professional filter
- WHEN calendar data refreshes
- THEN schedule blocks are replaced with data for the new scope without stale blocks

#### Scenario: Schedule request fails
- GIVEN booking data loads successfully but schedule retrieval fails
- WHEN the calendar renders
- THEN bookings remain visible, no schedule blocks are assumed, and an accessible non-blocking error is shown

### Requirement: Overlay accessibility and responsive behavior

Schedule blocks MUST have an accessible legend or text equivalent that identifies configured availability; green MUST NOT be the sole meaning. The overlay SHALL preserve existing booking contrast, focus order, and interaction semantics. At mobile widths it MUST remain readable in the existing day/agenda behavior and MUST NOT introduce horizontal overflow.

#### Scenario: Accessible schedule meaning
- GIVEN a user with low vision or a screen reader
- WHEN the calendar displays configured schedule
- THEN the availability meaning is available through text or an associated legend
- AND booking status remains distinguishable independently

#### Scenario: Mobile calendar
- GIVEN a 375px viewport with configured intervals
- WHEN the calendar displays its mobile day/agenda layout
- THEN schedule context remains visible without clipping or blocking booking controls
