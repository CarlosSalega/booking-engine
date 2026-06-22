# Bookings Data Access Layer Specification

## Purpose

Data access layer for the Bookings domain — paginated queries, filtering, and mutations for the Booking entity. Operates on top of the domain's Booking entity type, BookingStatus constants, and validation schemas.

## Requirements

### Requirement: Data Access Layer — getBookings

`BookingFilters` SHALL include an optional `patientId?: string` field. `getBookings` SHALL filter bookings by `patientId` when provided, adding `where.patientId = patientId` to the Prisma query. Backwards-compatible: existing callers omit `patientId`, no behavior change.

#### Scenario: Filter bookings by patientId

- GIVEN bookings exist for patient-A (2 bookings) and patient-B (1 booking)
- WHEN `getBookings(orgId, { patientId: patientAId })`
- THEN returns 2 bookings, all with patientId=patientAId

#### Scenario: Filter by patientId combined with other filters

- GIVEN patient-A has CONFIRMED and COMPLETED bookings
- WHEN `getBookings(orgId, { patientId: patientAId, status: ["CONFIRMED"] })`
- THEN returns only CONFIRMED booking for patient-A

#### Scenario: Backwards-compatible — patientId omitted

- GIVEN existing caller passes `getBookings(orgId, { status: ["PENDING"] })`
- WHEN patientId is undefined
- THEN all PENDING bookings returned (no patient scoping applied)

#### Scenario: Patient with no bookings returns empty

- GIVEN patient-C has zero bookings
- WHEN `getBookings(orgId, { patientId: patientCId })`
- THEN returns empty array, total=0
