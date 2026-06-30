# Proposal: Settings — Organization Configuration

## Intent

No centralized way to configure business identity, booking rules, or cancellation policies. Organizations operate on hardcoded defaults. Admins need a settings panel to control booking engine behavior without developer intervention.

## Scope

### In Scope (MVP)
- **Business config**: name, description, address, timezone, phone, email
- **Booking config**: default duration (min), min advance booking (hours), max bookings/day, buffer between appointments (min)
- **Cancellation config**: enable/disable, time limit before appointment (hours)
- **Prisma model**: `OrganizationSettings` (1 row per `organizationId`)
- **Module**: `src/modules/settings/` (domain / data / actions / presentation)
- **UI**: Tabbed settings page replacing placeholder (Business, Bookings, Cancellations)
- **Permissions**: `settings:manage` (ADMIN), `settings:view` (SECRETARY read-only)
- **Cache**: `use cache` + `updateTag("settings")` for SWR revalidation

### Out of Scope
- Payment config (MercadoPago, commissions)
- Branding / visual settings (logo, colors, cover, landing)
- Audit log for settings changes
- Cancellation penalty rules
- Per-professional setting overrides

## Capabilities

### New Capabilities
- `settings-domain`: Data model, Zod schemas, types, repository, cache layer
- `settings-presentation`: Tabbed settings page, form sections, RBAC-gated edit/read-only views

### Modified Capabilities
- `auth-core`: Add `settings:manage` and `settings:view` to RBAC permission map

## Approach

**Data model** — Single `OrganizationSettings` table with explicit typed columns, unique on `organizationId`. Defaults in domain constants.

**Module** — `domain/` (constants, schemas, types) → `data/` (repository, cache) → `actions/` (Server Actions) → `presentation/` (page, tabs, forms).

**Validation** — Zod 4 schemas per section composed into unified `updateSettingsSchema`. Server Actions validate with `safeParse`.

**Cache** — `getSettings()` uses `"use cache"` + `cacheTag("settings")`. Actions call `updateTag("settings")` after write.

**UI** — shadcn/ui Tabs + `useTransition + useState` forms. SECRETARY sees disabled fields.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `OrganizationSettings` model |
| `src/modules/settings/` | New | Full module (domain/data/actions/presentation) |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Modified | Replace placeholder |
| `src/modules/auth/domain/roles.ts` | Modified | Add settings permissions |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Config changes break active bookings | Medium | Changes apply to NEW bookings only |
| Cache staleness | Low | `updateTag` SWR; acceptable for admin traffic |

## Rollback Plan

Revert page to placeholder, drop table via migration rollback, remove permissions. Greenfield — no data risk.

## Dependencies

- `auth` module for RBAC and session
- `bookings` patterns as reference
- Prisma migration for new table

## Success Criteria

- [ ] Admin can view and update all three settings sections
- [ ] Secretary sees read-only settings
- [ ] Professional blocked from settings page
- [ ] Settings persist, organization-scoped
- [ ] Cache invalidates on update
- [ ] Domain logic and actions covered by unit tests (TDD)
