# Schedules Management Specification

## Purpose

Provide a weekly schedule editor at `/dashboard/schedule` for configured professional availability while preserving existing backend contracts and the empty-schedule fallback.

## Requirements

### Requirement: Weekly interval editor

The page SHALL render one editable row for each day of the week and SHALL support zero or more intervals per day. Each interval MUST expose start and end time fields, an Add interval control, and a Remove interval control.

#### Scenario: Existing schedule loads
- GIVEN an authorized professional with stored intervals
- WHEN `/dashboard/schedule` loads
- THEN intervals are grouped by day and displayed in ascending time order

#### Scenario: Empty schedule loads
- GIVEN an authorized professional with no stored intervals
- WHEN the page loads
- THEN every day is editable with an explicit empty state and Add interval action
- AND no fallback interval is silently inserted into the editor

#### Scenario: Add and remove interval
- GIVEN a day row is visible
- WHEN the user adds then removes an interval
- THEN only that row changes and other days retain their values

### Requirement: Validation and persistence contract

The editor MUST validate required times, valid weekly minute boundaries, end after start, and same-day overlaps before save. It SHALL call the existing `updateSchedule` contract with the selected `professionalId` and the complete interval list only when valid. Pending save MUST disable duplicate submission; success SHALL refresh the displayed schedule.

#### Scenario: Overlap is rejected inline
- GIVEN two intervals on the same day overlap
- WHEN either value creates the overlap
- THEN conflicting fields show an inline accessible error and save is unavailable

#### Scenario: Server validation or network failure
- GIVEN the client payload passes local validation
- WHEN `updateSchedule` returns an error or cannot be reached
- THEN the editor preserves unsaved values, announces a toast error, and permits retry

#### Scenario: Successful atomic replacement
- GIVEN a valid complete weekly interval list
- WHEN save succeeds
- THEN the success state is announced and the next load reflects the returned persisted schedule

### Requirement: Role-based access and errors

The route and editor MUST honor backend RBAC: ADMIN MAY manage any professional in the organization; PROFESSIONAL MAY manage only their own schedule; SECRETARY and PATIENT MUST NOT manage schedules. Unauthorized or cross-organization requests MUST show a safe error state and MUST NOT expose or mutate schedule data.

#### Scenario: ADMIN selects a professional
- GIVEN an authenticated ADMIN with organization-scoped professionals
- WHEN the page loads
- THEN the ADMIN can select a professional and edit that professional's schedule

#### Scenario: PROFESSIONAL is self-scoped
- GIVEN an authenticated PROFESSIONAL
- WHEN the page loads
- THEN only the professional's schedule is available and no other professional can be selected

### Requirement: Responsive accessible states

The editor MUST remain usable at 375px and tablet widths, preserve a logical screen-reader focus order, associate labels and errors with every time field, expose controls with at least 44px touch targets, and not rely on color alone. Loading, empty, pending, success, and error states MUST be perceivable.

#### Scenario: Mobile editing
- GIVEN a 375px viewport
- WHEN a user edits a day with multiple intervals
- THEN fields remain readable without horizontal clipping and controls remain operable

#### Scenario: Keyboard and assistive technology
- GIVEN keyboard navigation or a screen reader
- WHEN the user adds an interval or encounters an error
- THEN focus order is predictable and the new error/status is announced
