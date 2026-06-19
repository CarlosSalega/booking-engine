# Design: Services Domain Layer

## Technical Approach

Build the pure domain foundation in `src/modules/services/domain/` — 3 source files establishing the pattern for all future domain modules. The domain layer has ZERO dependencies on Next.js, React, or Prisma. Zod 4.4.3 is the sole external dependency. Types are the source of truth; schemas derive from and validate those types via `superRefine` for cross-field rules.

## Architecture Decisions

| Decision | Option A | Option B | Choice | Rationale |
|----------|----------|----------|--------|-----------|
| Money home | `service.ts` (inline) | `money.ts` (own file) | Inline in `service.ts` | 2 fields, tightly coupled to Service; extract when reused by 3+ modules (YAGNI) |
| DEFAULT_DURATION | `service.ts` | `constants.ts` (separate) | `service.ts` | Single constant doesn't warrant a file — KISS |
| Error messages | Inline strings | `const` object / enum | Inline English strings | 6 messages total; developers read these, not users (CONVENTIONS: internal errors never reach UI) |
| Test file naming | `service.schema.test.ts` | `service.test.ts` | `service.schema.test.ts` | Matches ARCHITECTURE.md convention (`module.schema.test.ts`), distinguishes from future entity tests |
| Money pattern | `interface` | `type` with branded nominal | `interface` | CONVENTIONS.md: interfaces for contracts; branding adds complexity with no MVP benefit |
| Const object utility | Inline `(typeof C)[keyof typeof C]` | Shared `ValueOf<>` in `@/lib` | Inline per module | No existing `ValueOf<>` in `src/lib/`; avoid premature abstraction — define per module until 3+ consumers |

## Data Flow

```
service.ts (types + const objects)
        │
        ▼
service.schema.ts (Zod 4 schemas)
        │  ┌─ per-field: .min(), .max(), z.enum()
        │  └─ cross-field: superRefine (rules 1–3)
        ▼
index.ts (barrel export)
        │
        ▼
  consumers: Server Actions, Repositories, UI forms
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/services/domain/service.ts` | Create | Types (`Service`, `Money`), const objects (`ServiceStatus`, `PaymentType`, `Currency`), derived types, `DEFAULT_DURATION_MINUTES` |
| `src/modules/services/domain/service.schema.ts` | Create | Zod 4 `moneySchema` + `serviceSchema` with per-field constraints and `superRefine` for 3 cross-field rules |
| `src/modules/services/domain/index.ts` | Create | Barrel re-export of all public symbols |
| `src/modules/services/domain/__tests__/service.schema.test.ts` | Create | Vitest tests: valid cases (NONE/DEPOSIT/FULL), rejection cases (6 business rules), edge cases |

## Schema Architecture

**Per-field constraints** (base schema, `z.object`):
- Rules 4–6: `durationMinutes` ≥ 1, `name` 1–100 chars, `description` ≤ 500 chars
- `status`, `paymentType`: `z.enum()` from const object values
- `price`, `depositAmount`: optional `moneySchema`

**Cross-field constraints** (`superRefine`, single pass):
- Rule 1: `paymentType === "DEPOSIT"` ∧ no `depositAmount` → error
- Rule 2: `depositAmount.amount > price.amount` → error
- Rule 3: `paymentType === "NONE"` ∧ `depositAmount` present → error

## Interfaces / Contracts

```typescript
// Money — value object, no identity, immutable by convention
interface Money {
  amount: number;   // positive, max 2 decimals
  currency: "ARS" | "USD";
}

// Service — entity type inferred from schema
type Service = z.infer<typeof serviceSchema>;

// Const pattern (single source of truth)
const ServiceStatus = { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" } as const;
type ServiceStatusType = (typeof ServiceStatus)[keyof typeof ServiceStatus];
```

`Service` is inferred from the schema (DRY). `Money` is a standalone `interface` — it appears both standalone and nested, and CONVENTIONS.md prescribes interfaces for contracts.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `moneySchema` validation | AAA: arrange input, act `safeParse`, assert `success`/`error.issues` |
| Unit | `serviceSchema` valid cases | 3 payment types (NONE, DEPOSIT with deposit, FULL without deposit), ACTIVE/INACTIVE status |
| Unit | `serviceSchema` rejections | All 6 business rules, negative durations, empty names, over-length descriptions |
| Unit | Edge cases | Duration = 1, name = 100 chars, description = 500 chars, deposit = price exactly |

Test factory: helper function `makeValidService(overrides?)` returning `Partial<Service>` to reduce boilerplate. Tests in `describe`/`it` blocks, `expect` assertions — no snapshot testing.

## Migration / Rollout

No migration required. This is a greenfield domain module with zero existing consumers. Rollback: delete `src/modules/services/`.

## Open Questions

- None — all key decisions resolved in the proposal and confirmed by codebase review.
