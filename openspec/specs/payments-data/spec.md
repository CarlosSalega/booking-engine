# Payments Data Specification

## Purpose

Data access layer for Payment entities. Pure async repository functions with Prisma. Flatten-on-read from Booking JOIN (patient, professional, service). No React/Next.js dependencies.

## Requirements

### Requirement: Repository Functions

Three pure async functions. First param `organizationId` for tenant isolation.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getPayments` | `(orgId, filters?) → PaginatedPayments` | Paginated list. Filters: `status` (ProviderPaymentStatus), `search` (booking patient name contains), `page` (1-indexed), `pageSize` (default 20). |
| `getPaymentById` | `(orgId, id) → EnrichedPayment` | Single payment with Booking JOIN. Throws PaymentNotFoundError if missing or wrong org. |
| `retryPayment` | `(orgId, id) → EnrichedPayment` | Increment retryCount, reset status to PENDING. Validates `canRetry()` first. Throws PaymentNotFoundError or RetryNotAllowedError. |

Types: `DEFAULT_PAGE_SIZE = 20`, `DEFAULT_MAX_RETRIES = 3` (imported from domain).

### Requirement: EnrichedPayment Type

`EnrichedPayment` SHALL extend domain `Payment` with Booking-derived fields obtained via Prisma `include`:

| Field | Source |
|-------|--------|
| `bookingStartTime` | `booking.startTime` |
| `patientName` | `booking.patient.user.name` |
| `professionalName` | `booking.professional.user.name` |
| `serviceName` | `booking.service.name` |
| `servicePaymentType` | `booking.service.paymentType` |

#### Scenario: getPaymentById returns enriched payment

- GIVEN Payment(id="p1") with Booking→Patient(User:"María"), Professional(User:"Dr. García"), Service(name:"Consulta")
- WHEN `getPaymentById(orgId, "p1")`
- THEN returns Payment fields + bookingStartTime, patientName="María", professionalName="Dr. García", serviceName="Consulta", servicePaymentType

### Requirement: PaymentFilters Type

`PaymentFilters` SHALL include: `status?: ProviderPaymentStatusType`, `search?: string`, `page?: number`, `pageSize?: number`. `PaginatedPayments` SHALL include: `payments: EnrichedPayment[]`, `total: number`, `page: number`, `pageSize: number`.

#### Scenario: getPayments with status filter

- GIVEN 3 APPROVED, 2 PENDING payments
- WHEN `getPayments(orgId, { status: "PENDING" })`
- THEN returns 2 PENDING payments, total=2

#### Scenario: getPayments with search filter

- GIVEN payment booking patient "María González"
- WHEN `getPayments(orgId, { search: "maría" })`
- THEN returns payments for "María González" via case-insensitive patient name match

#### Scenario: getPayments with page beyond available pages

- GIVEN 5 payments total, pageSize=3
- WHEN `getPayments(orgId, { page: 99, pageSize: 3 })`
- THEN returns empty array, total=5, page=99

### Requirement: Error Handling

`getPaymentById` and `retryPayment` SHALL throw `PaymentNotFoundError` when the payment does not exist in the given organization. `retryPayment` SHALL throw `RetryNotAllowedError` when `canRetry()` returns false.

#### Scenario: getPaymentById throws for wrong org

- GIVEN payment belongs to org-A
- WHEN `getPaymentById(orgB, paymentId)`
- THEN throws PaymentNotFoundError (tenant-isolated — wrong org returns not found)

#### Scenario: retryPayment throws when canRetry false

- GIVEN payment status=APPROVED or retryCount ≥ maxRetries
- WHEN `retryPayment(orgId, id)`
- THEN throws RetryNotAllowedError

#### Scenario: retryPayment resets status and increments retryCount

- GIVEN payment status=REJECTED, retryCount=1
- WHEN `retryPayment(orgId, id)`
- THEN retryCount=2, status=PENDING, returns EnrichedPayment
