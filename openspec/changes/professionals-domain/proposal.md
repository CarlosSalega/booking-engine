# Proposal: Professionals Domain

## Intent

Create the pure domain layer for the Professional entity — TypeScript types, const objects, and Zod 4 validation schemas. Follows the established pattern from `services-domain`. No persistence, UI, or server actions.

## Scope

### In Scope
- `Professional` type with all entity fields (id, organizationId, fullName, specialty, bio, avatarUrl, status, timestamps)
- `ProfessionalStatus` const object (ACTIVE, INACTIVE) — SUSPENDED deferred
- `professionalSchema` with Zod 4 validation and cross-field rules
- Barrel export (`index.ts`)
- Schema tests (`professional.schema.test.ts`)

### Out of Scope
- Availability/scheduling types (separate change)
- Professional-Service M:N relationship (separate change)
- Prisma schema or persistence (separate change)
- Server Actions for CRUD (separate change)
- UI components or dashboard pages (separate changes)

## Capabilities

### New Capabilities
- `professionals-domain`: Pure domain layer for the Professional entity — types, constants, Zod 4 validation, barrel export, and tests.

### Modified Capabilities
None

## Approach

Mirror the `services-domain` file structure and conventions:

```
src/modules/professionals/
  domain/
    professional.ts           — ProfessionalStatus const object, derived type
    professional.schema.ts    — professionalSchema (Zod 4), Professional type (inferred)
    index.ts                  — barrel export
    __tests__/
      professional.schema.test.ts
```

**Key decisions:**
- `status: ProfessionalStatusType` field (not `isActive: boolean`) — consistent with `ServiceStatus` pattern
- `z.uuid()` for id and organizationId (Zod 4 top-level validator)
- `z.url()` for avatarUrl optional field
- `superRefine` only if cross-field rules emerge (none expected for this entity)
- No Money value object needed (no pricing on Professional)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/professionals/domain/` | New | Entire directory is new |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `isActive` vs `status` field naming confusion | Low | Feature doc says `isActive` but pattern uses `status`; proposal uses `status` for consistency. Clarify in spec. |
| SUSPENDED status needed before expected | Low | Docs mark it as "futuro"; const object makes adding it trivial |

## Rollback Plan

Delete `src/modules/professionals/` directory. No other code depends on it.

## Dependencies

- None — this is a leaf module with no internal dependencies

## Success Criteria

- [ ] `Professional` type exported and inferred from `professionalSchema`
- [ ] `ProfessionalStatus` const object with ACTIVE/INACTIVE values
- [ ] Schema validates all required fields with correct constraints
- [ ] Schema rejects invalid UUIDs, empty fullName, oversized bio/specialty
- [ ] All tests pass (`vitest run src/modules/professionals/`)
- [ ] Barrel export re-exports all public symbols
