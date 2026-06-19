# Tasks: Services Domain Layer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150 (3 source files + 1 test file) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR — single foundation work unit |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add services domain layer: types, Zod 4 schemas, barrel export, and tests | PR 1 | Foundation pattern for `src/modules/`. Self-contained: no external consumers, reversible by deleting `src/modules/services/`. Single commit (tests shipped with code per work-unit-commits). |

## Phase 1: Domain Foundation (`src/modules/services/domain/service.ts`)

- [x] 1.1 Create `src/modules/services/domain/` directory
- [x] 1.2 Add `Money` interface (`amount: number`, `currency: "ARS" | "USD"`) — value object, no identity
- [x] 1.3 Add const objects `ServiceStatus`, `PaymentType`, `Currency` (`as const`) with derived types `ServiceStatusType`, `PaymentTypeType`, `CurrencyType` via `(typeof X)[keyof typeof X]`
- [x] 1.4 Add `DEFAULT_DURATION_MINUTES = 30` constant

## Phase 2: Validation Schemas (`src/modules/services/domain/service.schema.ts`)

- [x] 2.1 Add `moneySchema` — `amount` positive with `.multipleOf(0.01)`, `currency` enum from `Currency` values
- [x] 2.2 Add `serviceSchema` with per-field constraints: `id`/`organizationId` via `z.uuid()`, `name` 1–100, `description` max 500 (optional), `durationMinutes` positive integer, `status`/`paymentType` enums, `price`/`depositAmount` optional `moneySchema`
- [x] 2.3 Add `.superRefine()` for cross-field rules: (1) `paymentType=DEPOSIT` requires `depositAmount`, (2) `depositAmount.amount ≤ price.amount` when both present, (3) `paymentType=NONE` forbids `depositAmount`
- [x] 2.4 Export inferred `Service = z.infer<typeof serviceSchema>` using Zod 4 `error` param (not `message`)

## Phase 3: Barrel Export (`src/modules/services/domain/index.ts`)

- [x] 3.1 Re-export all public symbols: `Service`, `Money`, `ServiceStatus`, `ServiceStatusType`, `PaymentType`, `PaymentTypeType`, `Currency`, `CurrencyType`, `DEFAULT_DURATION_MINUTES`, `serviceSchema`, `moneySchema`

## Phase 4: Tests (`src/modules/services/domain/__tests__/service.schema.test.ts`)

- [x] 4.1 Add `makeValidService(overrides?)` factory returning a complete valid `Service` payload
- [x] 4.2 Add `moneySchema` tests: rejects negative amount, invalid currency, >2 decimal precision
- [x] 4.3 Add `serviceSchema` valid cases: NONE payment, DEPOSIT with valid deposit, FULL without deposit, ACTIVE and INACTIVE status
- [x] 4.4 Add `serviceSchema` rejection tests: DEPOSIT without deposit (rule 1), deposit > price (rule 2), NONE with deposit (rule 3), negative/zero duration (rule 4), empty name (rule 5), name > 100 chars, description > 500 chars
- [x] 4.5 Add edge case tests: `durationMinutes=1`, name at exactly 100 chars, description at exactly 500 chars, deposit exactly equal to price

## Phase 5: Verification

- [x] 5.1 Run `pnpm type-check` — strict mode passes, no `any`, no type errors
- [x] 5.2 Run `pnpm test` — all schema tests pass
- [x] 5.3 Run `pnpm lint` — no warnings on new files
- [x] 5.4 Verify barrel import resolves: `import { serviceSchema, ServiceStatus } from "@/modules/services"`
