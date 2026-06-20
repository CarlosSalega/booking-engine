# Bookings Domain Specification

## Purpose
Pure domain: Booking entity, 7-state BookingStatus, TimeSlot VO, 3 pure functions, Zod 4 schemas. Reuses PaymentStatus from services-domain.

## Requirements

### Requirement: Booking Entity Type
Export `Booking` and `BookingData` (Booking minus `id`, `createdAt`, `updatedAt`):

| Field | Type | Req | Constraint |
|-------|------|-----|------------|
| id, organizationId, patientId, professionalId, serviceId | UUID string | y | `z.uuid()` |
| startTime, endTime | Date | y | `z.date()` |
| status | BookingStatusType | y | enum of 7 |
| paymentStatus | PaymentStatusType | y | enum of 5 |
| notes | string | n | max 1000 |
| createdAt, updatedAt | Date | y | `z.date()` |

#### Scenario: Valid Booking
- GIVEN valid values for all 12 fields → THEN parse succeeds

#### Scenario: Minimal Booking (no notes)
- GIVEN required fields only, notes=undefined → THEN parse succeeds

### Requirement: BookingStatus Constants
Export `BookingStatus` const (no enum): `PENDING`, `CONFIRMED`, `CANCELLED`, `RESCHEDULED`, `COMPLETED`, `NO_SHOW`, `AWAITING_PAYMENT`. `BookingStatusType` = `(typeof BookingStatus)[keyof typeof BookingStatus]`.

Import `PaymentStatus` + `PaymentStatusType` from `@/modules/services/domain` — PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED.

#### Scenario: All status values accepted
- GIVEN each of 7 BookingStatus and 5 PaymentStatus values → THEN all parse correctly

### Requirement: TimeSlot Value Object
Export `TimeSlot { startTime: Date; endTime: Date }` and:

- `isValidTimeSlot(ts): boolean` — true iff `startTime < endTime`
- `isOverlapping(a, b): boolean` — true iff ranges overlap (boundary equality = overlap)

#### Scenario: isValidTimeSlot valid
- GIVEN startTime < endTime → THEN true

#### Scenario: isValidTimeSlot equal (invalid)
- GIVEN startTime == endTime → THEN false

#### Scenario: isValidTimeSlot reversed (invalid)
- GIVEN startTime > endTime → THEN false

#### Scenario: isOverlapping overlapping
- GIVEN A:10:00–11:00, B:10:30–11:30 → THEN true

#### Scenario: isOverlapping adjacent (no overlap)
- GIVEN A:10:00–11:00, B:11:00–12:00 → THEN false

#### Scenario: isOverlapping identical
- GIVEN A:10:00–11:00, B:10:00–11:00 → THEN true

### Requirement: State Machine — canTransition
Export `canTransition(from: BookingStatusType, to: BookingStatusType): boolean`.

| From | Valid To |
|------|----------|
| PENDING | CONFIRMED, CANCELLED, AWAITING_PAYMENT |
| CONFIRMED | COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED |
| AWAITING_PAYMENT | CONFIRMED, CANCELLED |
| COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED | none (terminal) |

Self-transitions (`from === to`) always return true.

#### Scenario: Valid transition
- GIVEN PENDING → CONFIRMED → THEN true

#### Scenario: Invalid — terminal
- GIVEN COMPLETED → PENDING → THEN false

#### Scenario: Invalid — reverse
- GIVEN CONFIRMED → PENDING → THEN false

#### Scenario: Self-transition
- GIVEN CONFIRMED → CONFIRMED → THEN true

### Requirement: Pure Function — calculateEndTime
Export `calculateEndTime(startTime: Date, durationMinutes: number): Date`.

#### Scenario: Normal
- GIVEN 10:00 + 30min → THEN 10:30

#### Scenario: Zero duration
- GIVEN 10:00 + 0min → THEN 10:00

### Requirement: Validation Schemas
`bookingSchema`: Zod 4 `z.object()` with 12 fields using `z.uuid()`, `z.date()`, `z.enum()`, `z.string().max(1000).optional()`. No `superRefine`.

`bookingDataSchema`: derived via `.omit({ id: true, createdAt: true, updatedAt: true })` with strict parsing.

#### Scenario: Valid booking parses
- GIVEN all fields valid → THEN success

#### Scenario: Rejects invalid UUID
- GIVEN id="bad-uuid" → THEN fails ("Invalid UUID")

#### Scenario: Rejects unknown status
- GIVEN status="UNKNOWN" → THEN fails ("Invalid booking status")

#### Scenario: Rejects unknown paymentStatus
- GIVEN paymentStatus="UNPAID" → THEN fails ("Invalid payment status")

#### Scenario: Rejects notes > 1000 chars
- GIVEN notes=1001 chars → THEN fails ("Notes max 1000")

#### Scenario: bookingDataSchema accepts without id
- GIVEN fields minus id/createdAt/updatedAt → THEN success

#### Scenario: bookingDataSchema rejects with id
- GIVEN input includes `id` field → THEN fails (strict mode)

### Requirement: Barrel Export
`index.ts` re-exports: `Booking`, `BookingData`, `BookingStatus`, `BookingStatusType`, `TimeSlot`, `isValidTimeSlot`, `isOverlapping`, `canTransition`, `calculateEndTime`, `bookingSchema`, `bookingDataSchema`.
