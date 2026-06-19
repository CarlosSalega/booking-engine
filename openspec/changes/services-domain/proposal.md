# Proposal: Services Domain Layer

## Intent

Build the pure domain foundation for the Services module — TypeScript types, constants, and Zod 4 validation schemas. This is the first feature module in `src/modules/` and establishes the pattern every subsequent domain module (bookings, professionals, payments) will follow. No database, no UI, no Server Actions.

## Scope

### In Scope
- Service entity types and value objects (Money)
- Domain constants: `ServiceStatus`, `PaymentType`
- Zod 4 validation schemas with cross-field refinements
- Barrel export (`index.ts`)
- Unit tests for schemas (Vitest)

### Out of Scope
- Prisma schema / database models
- Server Actions for CRUD
- UI components or dashboard pages
- Professional-Service M:N relationship
- Booking/payment integration
- Currency conversion logic

## Domain Model

### Entity: Service

| Field             | Type                          | Required | Notes                              |
|-------------------|-------------------------------|----------|------------------------------------|
| id                | string (UUID)                 | yes      |                                    |
| organizationId    | string (UUID)                 | yes      | Tenant ownership                   |
| name              | string                        | yes      | 1-100 chars                        |
| description       | string                        | no       | max 500 chars                      |
| durationMinutes   | number                        | yes      | default 30, positive integer       |
| price             | Money                         | no       | value object: amount + currency    |
| status            | ServiceStatus                 | yes      | ACTIVE \| INACTIVE                 |
| paymentType       | PaymentType                   | yes      | NONE \| DEPOSIT \| FULL            |
| depositAmount     | Money                         | no       | required when DEPOSIT, <= price    |
| createdAt         | Date                          | yes      |                                    |
| updatedAt         | Date                          | yes      |                                    |

### Value Object: Money

| Field    | Type     | Notes                          |
|----------|----------|--------------------------------|
| amount   | number   | positive, max 2 decimals       |
| currency | Currency | "ARS" \| "USD"                 |

### Constants

```
ServiceStatus = { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" }
PaymentType   = { NONE: "NONE", DEPOSIT: "DEPOSIT", FULL: "FULL" }
Currency      = { ARS: "ARS", USD: "USD" }
DEFAULT_DURATION_MINUTES = 30
```

### Business Rules (encoded in Zod schemas)

1. `paymentType = NONE` implies no deposit required
2. `paymentType = DEPOSIT` requires `depositAmount` with amount > 0
3. `depositAmount.amount` must be <= `price.amount` when both present
4. `status = INACTIVE` means service cannot be booked (enforced at booking layer, not here)
5. `durationMinutes` must be a positive integer

## Approach

### File Structure
```
src/modules/services/
  domain/
    service.ts           — types, const objects (ServiceStatus, PaymentType, Currency)
    service.schema.ts    — Zod 4 schemas with superRefine for cross-field rules
    index.ts             — barrel export
    __tests__/
      service.schema.test.ts — Vitest tests for schema validation
```

### Design Decisions

- **Const objects over TypeScript enums** — follows project TypeScript convention (const-first pattern), gives runtime values for Zod enum parsing
- **Money as value object** — separates amount/currency concerns, prepares for multi-currency support
- **Zod 4 `superRefine`** — cross-field validation (deposit <= price, deposit required when DEPOSIT) in a single refinement pass
- **Types inferred from Zod schemas** — `z.infer<typeof serviceSchema>` is the source of truth; standalone `type Service` exported for use where schema is not needed (e.g., DB mapping)
- **No business logic methods** — pure data + validation; domain services belong in a future change

### Conventions Applied
- kebab-case filenames (`service.ts`, not `Service.ts`)
- `import type` for type-only imports
- `z.uuid()`, `z.string()` (Zod 4 top-level validators)
- `error` param instead of `message` in Zod 4
- Barrel export via `index.ts`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/services/domain/` | New | First feature module — establishes pattern |
| `src/modules/` | New | Creates the modules directory |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Money value object over-engineering for MVP | Low | Only 2 fields (amount, currency); simplifies future multi-currency |
| Zod 4 API differences from v3 examples online | Med | Loaded zod-4 skill; using `error` param, top-level validators |
| Schema rules too strict for future flexibility | Low | No min/max on duration; refinements are additive |

## Rollback Plan

Delete `src/modules/services/` directory. No other code depends on this module. Zero risk to existing functionality.

## Dependencies

- Zod 4.4.3 (installed)
- Vitest 4.1.9 (installed, zero test files — this will be the first)

## Success Criteria

- [ ] `service.ts` exports const objects + inferred types for Service, Money, ServiceStatus, PaymentType, Currency
- [ ] `service.schema.ts` validates all business rules via Zod 4 `superRefine`
- [ ] Unit tests cover: valid service creation, each payment type, deposit > price rejection, inactive service schema validity
- [ ] `tsc --noEmit` passes with strict mode
- [ ] Barrel export works: `import { Service, serviceSchema } from "@/modules/services"`
