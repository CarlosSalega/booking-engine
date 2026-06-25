# Payments Actions Specification

## Purpose

Server action for `retryPayment`. Zod 4 validation, RBAC (ADMIN + SECRETARY), org-scoping, domain guard (`canRetry`). All error messages in Spanish.

## Requirements

### Requirement: PaymentResult Type

`retryPayment` SHALL return `PaymentResult<EnrichedPayment>`: discriminated union `{ success: true, data: EnrichedPayment } | { success: false, error: string }`. Error messages in Spanish.

### Requirement: retryPayment Server Action

`"use server"` action. Pipeline: Zod 4 validate input → `auth.api.getSession()` → RBAC check (ADMIN, SECRETARY) → `getOrganizationId()` → `canRetry()` guard → `retryPayment` data layer → `revalidatePath("/dashboard/payments")` + `revalidatePath("/dashboard/payments/[id]")` → return `PaymentResult<EnrichedPayment>`.

| Step | On Failure |
|------|-----------|
| No session | `{ success: false, error: "No autorizado" }` |
| Wrong role (PROFESSIONAL/PATIENT) | `{ success: false, error: "No autorizado" }` |
| Invalid `id` (not UUID) | `{ success: false, error: "ID de pago inválido" }` |
| PaymentNotFoundError | `{ success: false, error: "Pago no encontrado" }` |
| RetryNotAllowedError | `{ success: false, error: "No se puede reintentar este pago" }` |
| Success | `{ success: true, data: EnrichedPayment }` + revalidates |

### Requirement: Zod 4 Validation Schema

Action SHALL use `retryPaymentSchema = z.object({ id: z.uuid({ error: "ID de pago inválido" }) })`. Schema validated with `.parse()` before any business logic.

### Requirement: RBAC Enforcement

`retryPayment` SHALL reject PROFESSIONAL and PATIENT roles with `{ success: false, error: "No autorizado" }`. ADMIN and SECRETARY SHALL be permitted.

#### Scenario: retryPayment succeeds for ADMIN

- GIVEN valid session (ADMIN role), payment exists with status=REJECTED, retryCount=1
- WHEN `retryPayment({ id })`
- THEN returns `{ success: true, data: EnrichedPayment }` → retryCount=2, status=PENDING → revalidates list + detail paths

#### Scenario: retryPayment rejects invalid UUID

- GIVEN id="not-a-uuid"
- WHEN `retryPayment({ id: "not-a-uuid" })`
- THEN Zod parse fails → `{ success: false, error: "ID de pago inválido" }`

#### Scenario: retryPayment rejects no session

- GIVEN no active session (unauthenticated)
- WHEN `retryPayment({ id })`
- THEN returns `{ success: false, error: "No autorizado" }`

#### Scenario: retryPayment rejects PROFESSIONAL role

- GIVEN session.user.role = "PROFESSIONAL"
- WHEN `retryPayment({ id })`
- THEN returns `{ success: false, error: "No autorizado" }`

#### Scenario: retryPayment rejects payment not found

- GIVEN payment id nonexistent or wrong org
- WHEN `retryPayment({ id })`
- THEN returns `{ success: false, error: "Pago no encontrado" }`

#### Scenario: retryPayment rejects when retry not allowed

- GIVEN payment status=APPROVED or retryCount=3
- WHEN `retryPayment({ id })`
- THEN `canRetry()` returns false → `{ success: false, error: "No se puede reintentar este pago" }`
