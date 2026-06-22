# Proposal: Services Module — Application & Presentation Layers

## Intent

The services domain layer is complete (types, Zod 4 schemas, 22 tests) but has no persistence, actions, or UI. Professionals cannot manage their service catalog. This change delivers full CRUD: Prisma migration, data layer, server actions, and 4 pages — following the patients module pattern.

## Scope

### In Scope
- Prisma migration: add `depositAmount Float?` to `Service` model
- Data layer: `service-data.ts` with flatten-on-read Money↔Float mapping (ARS hardcoded)
- Server actions: `createService`, `updateService`, `changeServiceStatus` with RBAC
- List page: `/dashboard/services` (replace placeholder) with table, search, filters
- Detail page: `/dashboard/services/[id]`
- Create/Edit pages: `/dashboard/services/new`, `/dashboard/services/[id]/edit`
- Enriched DTOs with `professionalId` + `professionalName`

### Out of Scope (Non-goals)
- Multi-currency support (no `currency` column — ARS hardcoded)
- Removing `paymentStatus` from Prisma `Service` model (booking concern, future cleanup)
- Migrating bookings module to consume services data layer (coexist for now)
- Domain schema changes (domain is frozen)

## Capabilities

### New Capabilities
- `services-data`: Data layer — Prisma queries, Money↔Float mapping, enriched DTOs, pagination, filters
- `services-actions`: Server actions — create, update, changeStatus with Zod 4 action schemas and RBAC (ADMIN/SECRETARY write, PROFESSIONAL read-only)
- `services-presentation`: Pages and presentational components — list with table/filters/search, detail card, shared create/edit form

### Modified Capabilities
- None (existing `services-domain` spec unchanged)

## Approach

**Phased delivery — 4 PRs, each <400 lines**, mirroring patients module structure:

| PR | Deliverable | Key files |
|----|-------------|-----------|
| 1 | Migration + data layer | `prisma/migrations/*`, `src/modules/services/data/service-data.ts`, `service-data.types.ts` |
| 2 | Server actions | `src/modules/services/actions/create-service.action.ts`, `update-*.ts`, `change-status-*.ts`, action schemas |
| 3 | List page + components | `src/app/(dashboard)/dashboard/services/page.tsx`, `ServiceTable`, filters, badges |
| 4 | Detail + Create/Edit pages | `[id]/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`, `ServiceForm` |

**Key design decisions:**
- **Money↔Float**: Data layer owns mapping. `price: Float` → `{ amount, currency: "ARS" }` on read; flatten on write
- **professionalId bridge**: Accepted as action input, exposed in `EnrichedService` DTO, absent from domain `Service` type
- **paymentStatus ignored**: Data layer does not read or expose Prisma's `paymentStatus` field
- **Strict TDD**: Tests before implementation in every PR (`pnpm test`)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `depositAmount Float?` to Service model |
| `src/modules/services/data/` | New | Data layer: queries, mapping, types |
| `src/modules/services/actions/` | New | 3 server actions + schemas + types |
| `src/modules/services/presentation/` | New | Formatters, UI helpers |
| `src/app/(dashboard)/dashboard/services/` | Modified | Replace placeholder with full CRUD pages |
| `src/components/services/` | New | Presentational components (table, form, badges) |
| `src/modules/services/index.ts` | Modified | Export data, actions, presentation barrels |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `depositAmount` migration blocks DEPOSIT services | High | PR 1 ships migration first — unblocks all subsequent PRs |
| ARS hardcoding breaks if multi-currency needed soon | Low | Data layer isolates mapping — adding currency column later is a 1-file change |
| Bookings `getServices()` diverges from services data layer | Med | Both coexist; future refactor can unify. Bookings uses lightweight `ServiceOption`, services uses full `EnrichedService` |
| PROFESSIONAL role expects write access | Low | RBAC decision documented; sidebar already grants read access. Actions enforce ADMIN/SECRETARY |

## Rollback Plan

- **PR 1 (migration)**: `prisma migrate reset` reverts. No data loss (nullable column, no backfill)
- **PR 2-4 (code only)**: `git revert` of the PR merge commit. No data mutations to undo
- **Placeholder page**: Preserved in git history, trivial to restore

## Dependencies

- Prisma migration must run before data layer tests can use `depositAmount`
- Patients module pattern as structural reference (`src/modules/patients/`)
- Existing `services-domain` spec and Zod 4 schemas (frozen, no changes)

## Success Criteria

- [ ] `depositAmount` column exists in DB, migration is reversible
- [ ] Data layer passes all unit tests with Money↔Float mapping verified
- [ ] 3 server actions enforce RBAC (ADMIN/SECRETARY write, PROFESSIONAL rejected)
- [ ] List page renders services table with search, status filter, professional filter
- [ ] Create/Edit forms validate deposit cross-field rules via domain `serviceSchema`
- [ ] All PRs pass `pnpm test`, `pnpm lint`, `pnpm type-check`
- [ ] Each PR <400 lines diff
