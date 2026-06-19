# Tasks: Professionals Domain

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180 (4 source files + 1 test file) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Pure domain layer (types, schema, tests, barrels) | PR 1 | base: main; one commit `feat(professionals): add domain layer with validation schema` |

## Phase 1: Domain Implementation

- [x] 1.1 Create `src/modules/professionals/domain/professional.ts` exporting `ProfessionalStatus` const object (`{ ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" } as const`) and `ProfessionalStatusType = (typeof ProfessionalStatus)[keyof typeof ProfessionalStatus]`
- [x] 1.2 Create `src/modules/professionals/domain/professional.schema.ts` exporting `professionalSchema` (`z.uuid()` x2, `fullName` `.min(1).max(100)`, optional `specialty.max(100)` / `bio.max(1000)` / `avatarUrl.url()`, status enum, `z.date()` x2) and inferred `Professional` type — NO `superRefine`
- [x] 1.3 Create `src/modules/professionals/domain/index.ts` re-exporting all public symbols from `./professional` and `./professional.schema` (barrel)

## Phase 2: Test Suite

- [x] 2.1 Create `src/modules/professionals/domain/__tests__/professional.schema.test.ts` with `makeValidProfessional(overrides?)` factory and the 11 spec scenarios: 4 valid (all fields, minimal required-only, INACTIVE status, optional fields undefined) + 7 rejection (empty `fullName`, `fullName` > 100, `specialty` > 100, `bio` > 1000, invalid `avatarUrl`, invalid UUID for `id`, invalid status)

## Phase 3: Module Wiring

- [x] 3.1 Create `src/modules/professionals/index.ts` re-exporting from `./domain` (module-level barrel, matches `src/modules/services/index.ts`)

## Phase 4: Verification

- [x] 4.1 Run `npx vitest run src/modules/professionals/` — confirm all 11 scenarios pass
- [x] 4.2 Run `npx tsc --noEmit` — confirm zero type errors
