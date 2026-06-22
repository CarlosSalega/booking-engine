# Exploration: Services Module — Application + Presentation Layers

## Current State

### What EXISTS (domain layer — complete)

| Artifact | Path | Contents |
|----------|------|----------|
| Value objects & constants | `src/modules/services/domain/service.ts` | `Money { amount, currency }`, `Currency` (ARS/USD), `ServiceStatus` (ACTIVE/INACTIVE), `PaymentType` (NONE/DEPOSIT/FULL), `PaymentStatus` (PENDING/PAID/FAILED/REFUNDED/PARTIALLY_REFUNDED), `DEFAULT_DURATION_MINUTES` |
| Zod 4 schemas | `src/modules/services/domain/service.schema.ts` | `moneySchema`, `serviceSchema` with `superRefine` (3 deposit cross-field rules), exports `Service` type |
| Domain tests | `src/modules/services/domain/__tests__/service.schema.test.ts` | 22 tests covering money, valid cases, rejection rules, boundary values |
| Module barrel | `src/modules/services/index.ts` | Re-exports `./domain` only |
| Prisma model | `prisma/schema.prisma:137` | `Service` with `professionalId → Professional`, orgId, name, description, durationMinutes, price (Float), paymentType, paymentStatus, status |
| Existing spec | `openspec/specs/services-domain/spec.md` | Domain-only spec (types, schemas, constants, scenarios) |
| Placeholder page | `src/app/(dashboard)/dashboard/services/page.tsx` | "Próximamente" placeholder |
| Sidebar entry | `src/components/dashboard/sidebar.tsx:109` | `/dashboard/services` — roles: ADMIN, SECRETARY, PROFESSIONAL |

### Existing consumers (read-only, bypass domain)

| Consumer | Path | What it uses |
|----------|------|--------------|
| Booking wizard (step 1) | `src/modules/bookings/data/booking-data.ts` | `getServices()` → `ServiceOption { id, name, price (number), durationMinutes, paymentType }` — raw Prisma Float, no domain mapping |
| Booking filters bar | `src/components/bookings/booking-filters.tsx` | `ServiceOption[]` for dropdown |
| Dashboard top-services | `src/components/dashboard/top-services.tsx` | `getTopServices()` from dashboard module — count-based ranking |
| Payments domain | `src/modules/payments/domain/payment.ts` | Imports `PaymentStatus`, `PaymentType` constants only |
| Booking formatters | `src/modules/bookings/presentation/formatters.ts` | Imports `PaymentStatusType`, `PaymentTypeType` for display labels |

---

## Domain / Prisma Mismatches (CRITICAL)

| # | Field | Domain (`serviceSchema`) | Prisma (`Service` model) | Gap |
|---|-------|--------------------------|--------------------------|-----|
| 1 | `price` | `Money { amount: number, currency: CurrencyType }` (optional) | `Float @default(0)` | Domain has currency; Prisma has no currency column. Domain treats price as optional; Prisma defaults to 0 |
| 2 | `depositAmount` | `Money { amount, currency }` (optional, validated by superRefine) | **NO COLUMN** | Domain schema validates deposit rules, but there's no persistence for it |
| 3 | `paymentStatus` | Defined in domain (`PaymentStatus` const) | `String @default("PENDING")` | Present in both but semantically misplaced — `paymentStatus` is a per-booking concept, not a service-level attribute. A service doesn't have a payment status; a booking's payment does |
| 4 | `professionalId` | **NOT in domain schema** | `String` (required, FK → Professional) | Domain `Service` has no professionalId. The Prisma model requires it. The domain treats services as org-level; the DB ties them to a professional |
| 5 | `currency` | Part of `Money` value object | **NO COLUMN** | No way to persist which currency a service's price is in |

### Resolution strategy for mismatches

1. **price (Float → Money)**: Data layer flatten-on-read maps `price: number` → `price: { amount, currency: "ARS" }` with a hardcoded default currency (ARS). A future migration can add a `currency` column. For now, the data layer owns the mapping.
2. **depositAmount (missing column)**: Requires a Prisma migration to add `depositAmount Float?` column. Without it, the domain's deposit validation rules CANNOT be persisted. **This is a blocker for DEPOSIT payment type services.**
3. **paymentStatus on Service**: Design decision needed — either (a) remove from domain Service and keep only on Booking, or (b) keep as a "default/expected" status. Recommendation: **(a)** — it's a booking concern. The domain schema already doesn't include it.
4. **professionalId**: The domain schema intentionally omits it (services are org-level catalog items). The data layer must accept `professionalId` as input for create/update but the domain `Service` type stays clean. The list/detail DTOs should include `professionalId` + professional name.

---

## What a Data Layer Would Look Like

### Pattern: flatten-on-read (same as patients module)

```
Prisma Service row  ──→  mapToService()  ──→  Domain Service DTO
                                               + professionalName (enriched)
```

**Read mapping** (`mapToService`):
- `price: Float` → `price: { amount: row.price, currency: "ARS" }` (hardcoded until currency column exists)
- `depositAmount: Float?` → `depositAmount: row.depositAmount ? { amount: row.depositAmount, currency: "ARS" } : undefined`
- Include `professional: { select: { user: { select: { name: true } } } }` for enrichment
- Add `professionalName: string` to an `EnrichedService` type (extends domain `Service`)

**Write mapping** (create/update):
- `price: Money` → `price: input.price.amount` (flatten to Float)
- `depositAmount: Money` → `depositAmount: input.depositAmount?.amount`
- `professionalId` passed as input but NOT part of domain `Service` type

### Data layer functions needed

| Function | Purpose |
|----------|---------|
| `getServices(orgId, filters)` | Paginated list, filter by status/professionalId/search |
| `getServiceById(orgId, id)` | Single service with professional enrichment |
| `createService(orgId, input)` | Create with professionalId, map Money → Float |
| `updateService(orgId, id, input)` | Partial update |
| `changeServiceStatus(orgId, id, status)` | Toggle ACTIVE/INACTIVE |

### Types needed (`service-data.types.ts`)

- `ServiceFilters { status?, professionalId?, search?, page?, pageSize? }`
- `PaginatedServices { services: EnrichedService[], total, page, pageSize }`
- `EnrichedService extends Service { professionalId: string, professionalName: string }`
- `CreateServiceInput { name, description?, durationMinutes, price?, paymentType, depositAmount?, professionalId }`
- `UpdateServiceInput { name?, description?, durationMinutes?, price?, paymentType?, depositAmount?, professionalId? }`

---

## Actions Needed

| Action | Schema | RBAC | Notes |
|--------|--------|------|-------|
| `createService` | `createServiceSchema` (Zod 4, Spanish errors) | ADMIN, SECRETARY | Validate with domain `serviceSchema` AFTER data mapping. Check professional exists in org |
| `updateService` | `updateServiceSchema` (id + optional fields) | ADMIN, SECRETARY | Same deposit cross-field rules. Check professional exists if changed |
| `changeServiceStatus` | `changeServiceStatusSchema` (id + status) | ADMIN, SECRETARY | Simple toggle. Consider: should INACTIVE services block existing bookings? No — bookings have their own status |

---

## Pages Needed

| Route | Type | Description |
|-------|------|-------------|
| `/dashboard/services` | List (Server Component) | Table with search, status filter, professional filter. Replace placeholder |
| `/dashboard/services/[id]` | Detail (Server Component) | Service card with all fields, professional link, booking count |
| `/dashboard/services/new` | Create form | Form with all fields, professional selector |
| `/dashboard/services/[id]/edit` | Edit form | Pre-populated form, same fields |

### Presentational components needed

- `ServiceTable` + `ServiceTableSkeleton`
- `ServiceSearchBar`
- `ServiceStatusFilter`
- `ServiceProfessionalFilter`
- `ServiceStatusBadge`
- `ServicePaymentTypeBadge`
- `ServiceForm` (shared create/edit)
- `ServiceDetailCard`

---

## Prisma Migration Required

**Before** the data layer can persist deposit amounts, a migration must add:

```prisma
model Service {
  // ... existing fields ...
  depositAmount  Float?
}
```

This is a non-blocking migration (additive, nullable column, no data backfill needed).

---

## Approaches

### 1. Full stack in one change (data + actions + pages)

Build everything: migration, data layer, actions, all 4 pages, all components.

- **Pros**: Single coherent delivery, users get full CRUD at once
- **Cons**: Large change (~1500+ lines), hard to review, high risk
- **Effort**: High (3-4 PRs chained)

### 2. Phased — data layer first, then UI

Phase 1: Prisma migration + data layer + actions (testable without UI)
Phase 2: Pages + components (consume tested data layer)

- **Pros**: Each phase is reviewable, testable independently, follows established pattern (patients did this)
- **Cons**: Users don't see UI until phase 2 is done
- **Effort**: Medium (2 PRs)

### 3. Data layer + list page only (MVP)

Build migration + data layer + actions + list page. Defer detail/create/edit to a follow-up.

- **Pros**: Smallest useful slice, users can see services immediately
- **Cons**: Can't create/edit yet — still need DB access for changes
- **Effort**: Low-Medium (1-2 PRs)

---

## Recommendation

**Approach 2 (Phased)** — follows the exact pattern established by the patients module:

1. **PR 1**: Prisma migration (`depositAmount Float?`) + data layer (`service-data.ts`, `service-data.types.ts`) + tests
2. **PR 2**: Server Actions (`createService`, `updateService`, `changeServiceStatus`) + action schemas + action tests
3. **PR 3**: List page (`/dashboard/services`) + presentational components (table, filters, search, badges)
4. **PR 4**: Detail + Create + Edit pages + shared form component

Each PR stays under 400 lines. Each is independently testable.

---

## Estimated Complexity

| Artifact | Approx. lines | Files |
|----------|--------------|-------|
| Prisma migration | ~10 | 1 migration file |
| Data layer + types | ~250 | 2 files + 1 test file |
| Action schemas + types | ~120 | 2 files |
| Actions (3) | ~300 | 3 files + 3 test files |
| List page + components | ~350 | 5-6 files |
| Detail page | ~100 | 1-2 files |
| Create/Edit pages + form | ~300 | 3-4 files |
| **Total** | **~1430** | **~20 files** |

---

## Risks

1. **`depositAmount` column doesn't exist yet** — the domain schema validates it but Prisma can't persist it. The migration MUST come first. Without it, DEPOSIT payment type services can be validated but not saved.

2. **`paymentStatus` on Prisma Service model** — this field is semantically wrong (services don't have payment status, bookings do). The domain already excludes it. The data layer should ignore it on read and NOT expose it. A future cleanup could remove it from the Prisma model, but that's out of scope.

3. **Currency hardcoding** — until a `currency` column exists, the data layer must assume ARS. If the business needs multi-currency, a migration + domain adjustment is needed later.

4. **Professional-scoped vs org-scoped services** — the domain treats services as org-level (no professionalId in schema), but Prisma requires `professionalId`. The data layer must bridge this: accept professionalId as input, expose it in the enriched DTO, but keep the domain type clean. This means a service is always tied to a professional in practice.

5. **Bookings module coupling** — the bookings data layer has its own `getServices()` that returns `ServiceOption` (raw Prisma shape). When the services module gets its own data layer, the bookings module should ideally consume from it. But that's a refactor — for now, both can coexist (bookings keeps its lightweight query, services module has the full CRUD).

6. **Sidebar permissions** — PROFESSIONAL role has sidebar access to `/dashboard/services`. Should professionals be able to create/edit services, or only view? Current recommendation: ADMIN/SECRETARY for writes, PROFESSIONAL for read-only.

---

## Ready for Proposal

**Yes** — enough information exists to write a proposal. The orchestrator should tell the user:

> "The services module has a solid domain layer but needs a Prisma migration (depositAmount column), a data layer, server actions, and 4 pages to become functional. The main design decision is the Money↔Float mapping and the professionalId bridge between domain and persistence. Recommend a phased approach (4 PRs) following the patients module pattern."
