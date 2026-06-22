# Delta for Bookings Data

## MODIFIED Requirements

### Requirement: Data Access Layer — getBookings (MODIFIED)

`BookingFilters` SHALL add optional `patientId?: string` field. `getBookings` SHALL filter bookings by `patientId` when provided, adding `where.patientId = patientId` to the Prisma query. Backwards-compatible: existing callers omit `patientId`, no behavior change.

(Previously: `getBookings` had no `patientId` filter. `BookingFilters` had no `patientId` field.)

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
