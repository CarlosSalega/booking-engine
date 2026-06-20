# Payments Domain Specification

## Purpose
Pure domain: Payment entity, ProviderPaymentStatus, ACL mapping, retry logic, deposit completion, Zod 4 schemas. Reuses PaymentStatus/PaymentType from services-domain.

## Requirements

### Requirement: Provider Payment Status Constants
Export `ProviderPaymentStatus` const with 5 MercadoPago lifecycle states. Type extracted via `(typeof ProviderPaymentStatus)[keyof typeof ProviderPaymentStatus]`.

| Key | Value |
|-----|-------|
| PENDING | "PENDING" |
| IN_PROCESS | "IN_PROCESS" |
| APPROVED | "APPROVED" |
| REJECTED | "REJECTED" |
| CANCELLED | "CANCELLED" |

#### Scenario: All states present
- GIVEN ProviderPaymentStatus → THEN 5 keys exist, type is string literal union

### Requirement: Payment Provider Registry
Export `PaymentProvider` const → `PaymentProviderType`. MUST include MERCADOPAGO. Extensible; new providers are non-breaking.

#### Scenario: MERCADOPAGO defined
- GIVEN PaymentProvider → THEN MERCADOPAGO="MERCADOPAGO", type inferred correctly

### Requirement: Payment Entity Interface
Export `Payment` interface and `PaymentData` (Payment minus `id`, `createdAt`, `updatedAt`).

| Field | Type | Req |
|-------|------|-----|
| id, organizationId, bookingId | UUID string | y |
| provider | PaymentProviderType | y |
| status | PaymentStatusType (from services-domain) | y |
| amount | number (positive) | y |
| preferenceId, externalReference | string | n |
| retryCount | number (non-negative int, default 0) | n |
| parentPaymentId | UUID string | n |
| createdAt, updatedAt | Date | y |

#### Scenario: Valid Payment structure
- GIVEN required fields + timestamps → THEN interface accepts; optional parentPaymentId enables parent-child relationship

### Requirement: Provider-to-Business Status Mapping
Export `mapProviderToBusinessStatus(ps: ProviderPaymentStatusType): PaymentStatusType`. Pure ACL function.

| Provider | → Business |
|----------|-----------|
| PENDING, IN_PROCESS | PENDING |
| APPROVED | PAID |
| REJECTED, CANCELLED | FAILED |

#### Scenario: All mappings return correct PaymentStatus
- GIVEN each provider status → THEN PENDING/IN_PROCESS→PENDING, APPROVED→PAID, REJECTED/CANCELLED→FAILED

#### Scenario: Unknown status throws
- GIVEN invalid provider status → THEN throws Error

### Requirement: Payment Retry Logic
Export `canRetry(payment: Payment, maxRetries?: number): boolean`. Default maxRetries=3. Returns `retryCount < maxRetries AND status ≠ PAID`.

#### Scenario: Retry allowed
- GIVEN retryCount=1, status=PENDING → THEN true
- GIVEN retryCount=2, status=FAILED, maxRetries=3 → THEN true

#### Scenario: Retry denied
- GIVEN retryCount=3, status=FAILED → THEN false
- GIVEN retryCount=0, status=PAID → THEN false

### Requirement: Deposit Payment Completion
Export `isPaymentComplete(payments: Payment[], paymentType: PaymentTypeType): boolean`.

| PaymentType | Complete when |
|-------------|---------------|
| FULL | any payment status=PAID |
| DEPOSIT | parent PAID AND child PAID |
| NONE | always true |

#### Scenario: FULL — completion
- GIVEN FULL, one PAID → THEN true; GIVEN FULL, one FAILED → THEN false

#### Scenario: DEPOSIT — completion
- GIVEN DEPOSIT, parent=PAID, child=PAID → THEN true
- GIVEN DEPOSIT, parent=PAID, child=PENDING → THEN false
- GIVEN DEPOSIT, parent=FAILED → THEN false

#### Scenario: NONE
- GIVEN NONE, empty payments → THEN true

### Requirement: Provider Payment Validation Schema
Export `providerPaymentSchema` (Zod 4 `z.object()`):

| Field | Zod | Req |
|-------|-----|-----|
| id | z.string() | y |
| provider | z.enum(PaymentProvider) | y |
| status | z.enum(ProviderPaymentStatus) | y |
| amount | z.number().positive() | y |
| retryCount | z.number().int().min(0).optional() | n |
| parentPaymentId | z.string().optional() | n |

#### Scenario: Valid parses; invalid fails
- GIVEN valid fields → THEN parse succeeds
- GIVEN status="UNKNOWN" or retryCount=-1 → THEN fails

### Requirement: Payment Validation Schema
Export `paymentSchema` (Zod 4 `z.object()`):

| Field | Zod | Req |
|-------|-----|-----|
| bookingId, organizationId | z.string().uuid() | y |
| provider | z.enum(PaymentProvider) | y |
| amount | z.number().positive() | y |
| preferenceId, externalReference | z.string().optional() | n |
| retryCount | z.number().int().min(0).default(0) | n |
| parentPaymentId | z.string().uuid().optional() | n |

#### Scenario: Valid parses; invalid fails
- GIVEN bookingId(uuid), provider=MERCADOPAGO, amount=2000 → THEN parse succeeds
- GIVEN bookingId=undefined, amount=-100, or provider="INVALID" → THEN fails

### Requirement: Barrel Export
`index.ts` re-exports all public symbols: 2 entities, 4 consts+types, 3 functions, 2 schemas.
