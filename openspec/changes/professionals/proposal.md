# Proposal: Professionals Module

## Intent

The Professionals module domain schema is stale — 5 of 8 fields diverge from the Prisma model, blocking any real CRUD work. This change aligns the domain to the database, builds the full data/action/presentation stack, and delivers a usable professionals management experience (list, create, edit, detail, status toggle) behind the existing sidebar entry.

## Scope

### In Scope
- Rewrite `professionals/domain` schema to match Prisma `Professional` model (flatten-on-read from `User`, add `userId`/`email`/`license`, change `specialty?: string` → `specialties: string[]`)
- Data layer: `getProfessionals`, `getProfessionalById`, `createProfessional`, `updateProfessional`
- Server actions: `createProfessional`, `updateProfessional`, `changeProfessionalStatus` with Zod 4 validation, RBAC (ADMIN/SECRETARY), email dedup, P2002/P2025 handling
- List page: table, search, status filter, status badge, empty state, formatters
- Detail + Create + Edit pages with shared `ProfessionalForm` (tag input for specialties)
- Unit tests for domain + data + actions (TDD, strict mode)

### Non-goals
- Professional scheduling / availability management
- Public-facing professional profile or patient-visible listing
- Migration script for existing rows (no professionals exist in production yet)
- Bulk import/export of professionals
- Integration with external provider registries

## Capabilities

### New Capabilities
- `professionals-data`: Repository layer for professional queries with User-relation flattening
- `professionals-actions`: Server actions with RBAC, validation, dedup, and status transitions
- `professionals-presentation`: List, detail, create, and edit UI with search/filter/form

### Modified Capabilities
- `professionals-domain`: Schema rewrite — fields, validation rules, and barrel exports change to match Prisma and support `specialties: string[]`

## Approach

Follow the proven `services` module skeleton (domain → data → actions → presentation). Apply the `patients` module's split-write pattern: create/update wrap `prisma.$transaction([createUser, createProfessional])`, reads flatten `user.fullName`/`user.email`/`user.image` into the DTO. Four sequential PRs, each independently deployable and reviewable.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/professionals/domain/` | Modified | Schema rewrite, new types, updated tests |
| `src/modules/professionals/data/` | New | Repository functions + tests |
| `src/modules/professionals/actions/` | New | Three server actions + tests |
| `src/modules/professionals/presentation/` | New | Pages + components |
| `src/modules/bookings/data/getProfessionalsForService.ts` | Modified | Consume new domain types (replace `ProfessionalOption`) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking `getProfessionalsForService` consumers | Low | Update call site in same PR #1; type-check gate |
| Email dedup race under concurrent creates | Low | Rely on unique constraint + P2002 handling |
| Tag-input UX for specialties regresses | Med | Reuse existing tag component from services if present |

## Rollback Plan

Each PR is independently revertable. Domain rewrite (PR #1) has no production data to migrate — revert is a clean git revert. PRs #2–#4 touch only new files plus one bookings call site (reverted with PR #1 if needed).

## Dependencies

- `patients` module patterns (reference, not runtime dep)
- `services` module skeleton (reference)
- Existing `User` model and Better Auth session for RBAC

## Success Criteria

- [ ] Domain schema fields match Prisma `Professional` model 1:1
- [ ] All domain/data/action unit tests pass under `pnpm test`
- [ ] List page renders professionals with working search + status filter
- [ ] Create/edit flow persists a professional + linked user in a single transaction
- [ ] Status toggle transitions ACTIVE ↔ INACTIVE with RBAC enforced
- [ ] `pnpm type-check` and `pnpm lint` clean
- [ ] Bookings module still resolves professional options for service selection
