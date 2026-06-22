# Design: Services Module — Application & Presentation Layers

## Technical Approach

Mirror the patients module pattern: data layer with flatten-on-read Money↔Float mapping (ARS hardcoded), server actions with Zod 4 schemas + RBAC, and pages following Server/Client boundary conventions. Domain layer is frozen — new code lives in `data/`, `actions/`, `presentation/`, and `src/components/services/`. Delivered in 4 PRs under 400 lines each.

## Architecture Decisions

### AD1: Data Layer — DTO Mapping

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Store currency column, map on read | Future-proof, needs migration now | Rejected (out of scope) |
| Keep price as raw Float in DTO | Simple, breaks domain Money contract | Rejected |
| Hardcode ARS in data layer, map Float→Money on read | Simple, 1-file change to add currency later | **Chosen** |

`price: Float` → `{ amount: row.price, currency: "ARS" }` on read; flattened on write. Same for `depositAmount`. `professionalId` is input-only, exposed via `EnrichedService` DTO on reads. `paymentStatus` column is ignored entirely.

### AD2: Migration

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Store deposit as JSON | Queryable | Rejected (overkill) |
| Add `depositAmount Float?` column | Additive, nullable, no backfill | **Chosen** |

Command: `pnpm prisma migrate dev --name add_service_deposit_amount`.

### AD3: RBAC

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Allow PROFESSIONAL to create/edit | Risks catalog inconsistency across professionals | Rejected |
| ADMIN/SECRETARY: full CRUD; PROFESSIONAL: read-only | Matches patient module pattern | **Chosen** |

Enforced in actions (per-action role check). PATIENT blocked by dashboard layout.

### AD4: Status Changes

| Option | Tradeoff | Decision |
|--------|----------|----------|
| State machine (ACTIVE→INACTIVE→BLOCKED) | Over-engineering for 2-state toggle | Rejected |
| Any transition via `prisma.service.update` | Simple, matches patient module | **Chosen** |

### AD5: Component Tree — Server/Client Boundary

| Option | Tradeoff | Decision |
|--------|----------|----------|
| All pages as Client Components | Loses streaming, SSR | Rejected |
| List/Detail: Server Components; Create/Edit: Client forms + useActionState | Matches patients pattern | **Chosen** |

List page uses `<Suspense>` + async data wrapper. Forms use Client Components calling server actions.

### AD6: File Structure

| Layer | Path | Contents |
|-------|------|----------|
| Data | `src/modules/services/data/` | `service-data.ts`, `service-data.types.ts` |
| Actions | `src/modules/services/actions/` | 3 actions + `service-actions.schema.ts` + `service-actions.types.ts` + `index.ts` |
| Presentation | `src/modules/services/presentation/` | `formatters.ts`, `index.ts` |
| Components | `src/components/services/` | `service-table.tsx`, `service-form.tsx`, `service-status-badge.tsx`, `service-detail-card.tsx`, `service-table-skeleton.tsx` |
| Pages | `src/app/(dashboard)/dashboard/services/` | `page.tsx`, `[id]/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx` |

### AD7: 4-PR Breakdown

| PR | Scope | Lines |
|----|-------|-------|
| #1 | Migration + data layer + types + tests | ~350 |
| #2 | 3 server actions + action schemas + types + tests | ~350 |
| #3 | List page + ServiceTable + filters + formatters + tests | ~350 |
| #4 | Detail + Create + Edit pages + ServiceForm + tests | ~380 |

### AD8: Bookings Coexistence

Bookings module has its own `getServices()` returning `ServiceOption` (raw Float). Services module gets its own `getServices()` returning `EnrichedService` (Money DTO). Both coexist — no bookings changes. Future: bookings wizard imports from services data layer.

## Data Flow

```
Prisma Service row ──→ mapToEnrichedService() ──→ EnrichedService DTO
  price: Float           ARS hardcoded               price: Money
  depositAmount: Float?  + professional include      depositAmount?: Money
                                                     + professionalId, professionalName

Action input ──→ Zod 4 schema (safeParse) ──→ data layer (flatten Money→Float)
  price: Money          RBAC check                  price: input.price.amount
  professionalId        revalidatePath              professionalId
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `depositAmount Float?` to Service |
| `src/modules/services/data/service-data.ts` | Create | 5 data functions with flatten-on-read mapping |
| `src/modules/services/data/service-data.types.ts` | Create | `EnrichedService`, `ServiceFilters`, input types |
| `src/modules/services/actions/*.ts` (6 files) | Create | 3 actions + schema + types + barrel |
| `src/modules/services/presentation/formatters.ts` | Create | `getServiceStatusLabel`, `getPaymentTypeLabel`, `formatPrice` |
| `src/modules/services/index.ts` | Modify | Add `data/`, `actions/`, `presentation/` exports |
| `src/components/services/*.tsx` (5 files) | Create | Table, form, badges, detail card, skeleton |
| `src/app/(dashboard)/dashboard/services/` (4 files) | Modify+Create | Replace placeholder, add detail/create/edit pages |

## Interfaces / Contracts

```typescript
interface EnrichedService extends Service {
  professionalId: string;
  professionalName: string;
}

interface ServiceFilters {
  status?: ServiceStatusType;
  professionalId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

`CreateServiceInput` and `UpdateServiceInput` accept `price: Money` (not Float) — actions validate with Zod 4, data layer flattens to Float on write.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Money↔Float mapping, formatters | Vitest, pure functions |
| Unit | Zod 4 action schemas (validation + deposit rules) | Vitest, `safeParse` |
| Integration | Data layer CRUD against test DB | Vitest + Prisma, org-scoped |
| Integration | Server actions: RBAC enforcement, error paths | Vitest, mock auth session |
| Component | Form validation, status badges | Vitest + RTL + jsdom |

## Migration / Rollout

- **PR #1** runs `pnpm prisma migrate dev` — additive, nullable column, no downtime
- Rollback: `prisma migrate reset` for migration; `git revert` for code PRs

## Open Questions

- [ ] Should INACTIVE services block new bookings? (current: no — bookings have their own status)
- [ ] Should service deletion be allowed? (out of scope — status toggle as soft-delete)
