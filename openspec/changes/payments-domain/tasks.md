# Tasks: Payments Domain

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~360 |
| 400-line budget risk | Low |
| Chained PRs recommended | No (under budget) |
| Suggested split | Single PR, 2 work-unit commits |
| Delivery strategy | force-chained → single PR (under budget) |
| Chain strategy | feature-branch-chain (applies to future infrastructure phase) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

### Suggested Work Units

| Unit | Commit | Scope | Notes |
|------|--------|-------|-------|
| 1 | Commit 1 | Domain core: `payment.ts` + barrels + tests | RED→GREEN. Commit message: `feat(payments): add domain layer with Payment entity, provider statuses, and pure functions` |
| 2 | Commit 2 | Validation: `payment.schema.ts` + tests + verification | RED→GREEN. Commit message: `test(payments): add Zod 4 validation schemas and unit tests` |

## Phase 1: Domain Foundation (RED → GREEN, strict TDD)

- [x] 1.1 Create `src/modules/payments/domain/` directory
- [x] 1.2 RED: Write `src/modules/payments/domain/__tests__/payment.test.ts` — consts (6 cases), ACL mapping (6 cases + unknown throws), `canRetry` (5 scenarios), `isPaymentComplete` (5 scenarios), barrel completeness, module isolation
- [x] 1.3 GREEN: Create `src/modules/payments/domain/payment.ts` — `ProviderPaymentStatus` const+type (5 values), `PaymentProvider` const+type (MERCADOPAGO), `Payment` interface (12 fields), `mapProviderToBusinessStatus()` (fail-closed throw on unknown), `canRetry()` (default `maxRetries=3`), `isPaymentComplete()` (NONE always true, FULL single APPROVED, DEPOSIT parent+child both APPROVED)
- [x] 1.4 Create `src/modules/payments/domain/index.ts` — alphabetical barrel re-exporting `payment` (schema added in Phase 2)
- [x] 1.5 Create `src/modules/payments/index.ts` — module barrel (`export * from "./domain"`)
- [x] 1.6 Verify: `pnpm test payment.test.ts` — 24 tests green

## Phase 2: Validation Schemas (RED → GREEN, strict TDD)

- [ ] 2.1 RED: Write `src/modules/payments/domain/__tests__/payment.schema.test.ts` — valid parses, invalid enum values, negative amounts, missing UUIDs, default `retryCount=0`, optional `parentPaymentId`, barrel re-exports
- [ ] 2.2 GREEN: Create `src/modules/payments/domain/payment.schema.ts` — `providerPaymentSchema` + `paymentSchema` using `z.enum(Object.values(const) as [string, ...string[]])`, `.positive()`, `.int().nonnegative()`, `.optional()`
- [ ] 2.3 Verify: `pnpm test payment.schema.test.ts` — 12 tests green

## Phase 3: Module-Wide Verification

- [ ] 3.1 Run `pnpm test` — 139 existing + 29 new = ~168 tests pass (zero regressions)
- [ ] 3.2 Run `pnpm type-check` — strict mode passes, no `any`, no type errors
- [ ] 3.3 Run `pnpm lint` — no warnings on new files
- [ ] 3.4 Verify domain isolation: `readFileSync` asserts no imports from `next/*`, `react`, or `@prisma/client`
- [ ] 3.5 Verify cross-module read-only deps: `PaymentStatus`, `PaymentType` from `@/modules/services/domain` resolve cleanly
- [ ] 3.6 Verify barrel import: `import { paymentSchema, ProviderPaymentStatus } from "@/modules/payments"` resolves
