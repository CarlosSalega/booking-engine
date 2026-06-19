# Services Domain Specification

## Purpose

Defines the Service entity — a core aggregate for work offered by a business. Pure domain layer: TypeScript types, constants, and Zod 4 validation. No persistence, I/O, or UI.

## Requirements

### Requirement: Service Entity Type

The system MUST export a `Service` type (`z.infer<typeof serviceSchema>`) with:

| Field | Type | Req | Constraints |
|-------|------|-----|-------------|
| id | `string` (UUID) | y | — |
| organizationId | `string` (UUID) | y | — |
| name | `string` | y | 1–100 chars |
| description | `string` | n | max 500 chars |
| durationMinutes | `number` | y | positive integer |
| price | `Money` | n | — |
| status | `ServiceStatusType` | y | ACTIVE or INACTIVE |
| paymentType | `PaymentTypeType` | y | NONE / DEPOSIT / FULL |
| depositAmount | `Money` | n | required when DEPOSIT; ≤ price |
| createdAt | `Date` | y | — |
| updatedAt | `Date` | y | — |

### Requirement: Money Value Object

| Field | Type | Constraints |
|-------|------|-------------|
| amount | `number` | positive, max 2 decimals |
| currency | `CurrencyType` | "ARS" or "USD" |

#### Scenario: Rejects negative amount
- GIVEN amount=-100, currency="ARS"
- WHEN parsed by moneySchema
- THEN validation FAILS

#### Scenario: Rejects invalid currency
- GIVEN amount=100, currency="EUR"
- WHEN parsed by moneySchema
- THEN validation FAILS

### Requirement: Domain Constants

Export const-object-based constants (no TS enums):

| Constant | Values | Extracted type |
|----------|--------|----------------|
| `ServiceStatus` | `ACTIVE:"ACTIVE"`, `INACTIVE:"INACTIVE"` | `ServiceStatusType` |
| `PaymentType` | `NONE:"NONE"`, `DEPOSIT:"DEPOSIT"`, `FULL:"FULL"` | `PaymentTypeType` |
| `Currency` | `ARS:"ARS"`, `USD:"USD"` | `CurrencyType` |
| `DEFAULT_DURATION_MINUTES` | `30` | `number` |

Types MUST use `(typeof CONST)[keyof typeof CONST]`.

### Requirement: Service Validation Schema

Zod 4 `serviceSchema` using `z.object()` with `superRefine` for cross-field rules:

| # | Rule | Condition | Error |
|---|------|-----------|-------|
| 1 | DEPOSIT needs depositAmount | `paymentType="DEPOSIT"` ∧ no `depositAmount` | "Deposit is required for DEPOSIT payment type" |
| 2 | Deposit ≤ price | `depositAmount.amount > price.amount` | "Deposit must not exceed price" |
| 3 | NONE forbids deposit | `paymentType="NONE"` ∧ `depositAmount` present | "Deposit not allowed for NONE payment type" |
| 4 | Positive duration | `durationMinutes < 1` | "Duration must be a positive integer" |
| 5 | Name length | `< 1` or `> 100` chars | "Name must be 1-100 characters" |
| 6 | Description length | `> 500` chars | "Description max 500 characters" |

#### Scenario: Valid service — NONE payment
- GIVEN name="Consulta", durationMinutes=30, paymentType="NONE", status="ACTIVE"
- WHEN parsed by serviceSchema
- THEN parse succeeds

#### Scenario: Valid service — DEPOSIT payment
- GIVEN paymentType="DEPOSIT", price={amount:2000,currency:"ARS"}, depositAmount={amount:500,currency:"ARS"}
- WHEN parsed by serviceSchema
- THEN parse succeeds

#### Scenario: Valid service — FULL payment
- GIVEN paymentType="FULL", price={amount:3000,currency:"USD"}, no depositAmount
- WHEN parsed by serviceSchema
- THEN parse succeeds

#### Scenario: Rejects DEPOSIT without depositAmount
- GIVEN paymentType="DEPOSIT", price present, depositAmount=undefined
- WHEN parsed by serviceSchema
- THEN validation FAILS (rule 1)

#### Scenario: Rejects deposit exceeding price
- GIVEN price={amount:1000}, depositAmount={amount:1500}
- WHEN parsed by serviceSchema
- THEN validation FAILS (rule 2)

#### Scenario: Rejects negative duration
- GIVEN durationMinutes=-5
- WHEN parsed by serviceSchema
- THEN validation FAILS (rule 4)

#### Scenario: Rejects empty name
- GIVEN name=""
- WHEN parsed by serviceSchema
- THEN validation FAILS (rule 5)

#### Scenario: Service status transitions
- GIVEN a valid service with status="ACTIVE"
- WHEN the same payload is parsed with status="INACTIVE"
- THEN both parse successfully — enforcement at application layer

### Requirement: Barrel Export

`index.ts` MUST re-export all public symbols: `Service`, `Money`, `ServiceStatus`, `PaymentType`, `Currency`, derived types (`ServiceStatusType`, `PaymentTypeType`, `CurrencyType`), `DEFAULT_DURATION_MINUTES`, `serviceSchema`, `moneySchema`.
