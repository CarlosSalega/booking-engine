# Design: Organization Settings

## Technical Approach

New `src/modules/settings/` module following `services/` Clean Architecture: `domain/ → data/ → actions/ → presentation/`. Single `OrganizationSettings` Prisma row per `organizationId`. Server Component reads via `getSettings(orgId)` (cached). Client tabs use `useTransition + useState` (project convention). Three Server Actions return `Promise<SettingsResult<T>>` (discriminated union). Cache: `"use cache"` + `cacheTag("settings")` on read, `updateTag("settings")` on write. RBAC: dashboard layout blocks unauthenticated + PATIENT; `SettingsGuard` redirects PROFESSIONAL; actions admin-only defense-in-depth.

## Architecture Decisions

| Decision | Tradeoff | Choice |
|----------|----------|--------|
| Module structure | Flat simpler, domain-separated enables TDD | `domain/data/actions/presentation` |
| Cache | `unstable_cache` legacy; `"use cache"` has SWR | `"use cache"` + `cacheLife(300)` + `updateTag` |
| Form strategy | Combined form loses cross-tab edits | One `useTransition + useState` per tab |
| Data layer | Split adds indirection | Single `settings-data.ts` — matches all modules |
| RBAC layering | Single guard simpler but fragile | Layout → SettingsGuard → actions |
| Timezone input | Library heavy | Native `<select>` with curated IANA list |
| Sidebar | SECRETARY needs access | Add `USER_ROLE.SECRETARY` to sidebar |

## Data Flow

**Read**: `SettingsPage` (RSC) → `getSettings(orgId)` → `"use cache"` + `cacheTag("settings")` → internal `getByOrgId(orgId)` → Prisma.

**Write**: Tab form (`useTransition + useState`) → `e.preventDefault()` → `safeParse(values)` → `startTransition(() => action(parsed.data))`. Every Server Action: `getOrganizationId()` → `upsertSettings(orgId, data)` → `updateTag("settings")`. Error branch: `setFormError(result.error)` + toast. Success branch: toast + `router.refresh()`.

**Guard layering**: Dashboard layout → unauthenticated/PATIENT redirect. SettingsGuard (Client) → PROFESSIONAL redirect, SECRETARY `readOnly`. Actions → admin-only defense-in-depth.

## Prisma Model

`OrganizationSettings` — unique on `organizationId`, indexed. Fields: `id` (uuid PK), `organizationId`, `name`, `description?`, `address?`, `timezone` (default `America/Argentina/Buenos_Aires`), `phone?`, `email?`, `defaultDurationMinutes` (default 30, 5–480), `minAdvanceBookingHours` (default 1, 0–168), `maxBookingsPerDay` (default 50, 1–200), `bufferMinutes` (default 0, 0–120), `cancellationEnabled` (default true), `cancellationLimitHours` (default 24, 0–168), `createdAt`, `updatedAt`.

## Module File Tree

| File | Purpose |
|------|---------|
| `domain/constants.ts` | `SETTINGS_DEFAULTS` const + inferred type |
| `domain/settings.schema.ts` | Zod 4 schemas per section + composed partial strict schema |
| `data/settings-data.ts` | `getByOrgId`, `upsertSettings` (Prisma), `getSettings` (`"use cache"` wrapper) |
| `data/settings-data.types.ts` | `OrganizationSettings`, input types, repository interface |
| `actions/settings-actions.types.ts` | `SettingsResult<T>` discriminated union |
| `actions/settings-actions.schema.ts` | Action-level Zod schemas (Spanish errors) |
| `actions/update-settings.action.ts` | `updateBusiness`, `updateBookings`, `updateCancellations` (all call `getOrganizationId()`) |
| `presentation/settings-page.tsx` | RSC: reads settings via cache, renders `<Tabs>` |
| `presentation/settings-guard.tsx` | Client: PROFESSIONAL → redirect; SECRETARY → `readOnly` |
| `presentation/tabs/*.tsx` | Three tab forms (`useTransition + useState` each) |
| `presentation/timezone-select.tsx` | Native `<select>` with curated IANA list |

All subdirectories have `index.ts` barrels matching the `services/` convention.

## Existing File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `OrganizationSettings` model |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Modify | Replace `<PlaceholderPage>` with `<SettingsPage>` |
| `src/modules/auth/domain/roles.ts` | Modify | Add `settings:manage` (ADMIN), `settings:view` (ADMIN+SECRETARY) |
| `src/components/dashboard/sidebar.tsx` | Modify | Add `USER_ROLE.SECRETARY` to Configuración `roles` |
| `src/components/ui/tabs.tsx` | Create | Install via `pnpm dlx shadcn@canary add tabs` |

## Interfaces

**Data**: `getByOrgId(orgId)`, `upsertSettings(orgId, data)`, `getSettings(orgId)` (cached). Single file `settings-data.ts`.

**Actions**: `SettingsResult<T>` discriminated union (mirrors `ServiceResult<T>`): `{ success: true; data: T } | { success: false; error: string }`. Three actions — `updateBusiness`, `updateBookings`, `updateCancellations` — each returns `Promise<SettingsResult>`, internally calls `getOrganizationId()`.

**Guard**: `SettingsGuard({ children, permissions, session })` — Client Component. PROFESSIONAL → `redirect("/dashboard")`, SECRETARY → `readOnly=true`.

**Form pattern**: `useTransition + useState` (same as `ServiceForm`). Local `values`, `fieldErrors`, `formError`. Submit: `safeParse → startTransition → action → branch on result.success`. Explicitly NOT `useActionState`.

## RBAC Guard Layering

| Layer | Rules |
|-------|-------|
| Dashboard layout | Unauthenticated → `/login`. PATIENT → `/dashboard` |
| SettingsGuard (Client) | PROFESSIONAL → `/dashboard`. SECRETARY → `readOnly=true` |
| Server Actions | `auth.api.getSession()` → reject non-ADMIN (defense-in-depth) |

## Cache Flow

Read: `getSettings(orgId)` → `"use cache"` + `cacheTag("settings")` + `cacheLife(300)`. Write: action → `getOrganizationId()` → `upsertSettings` → `updateTag("settings")`.

## Migration

```bash
pnpm prisma migrate dev --name add_organization_settings
```
Greenfield table — `upsert` populates defaults. No data migration needed.

## Test Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Domain | Zod schemas valid/partial/bad input, defaults | Vitest `safeParse` |
| Data | `upsert` create/update, `getByOrgId` null | Vitest — mock Prisma |
| Cache | `cacheTag` on read, `updateTag` on write | Vitest — mock `next/cache` |
| Actions | RBAC reject, Zod errors, `getOrganizationId` + `upsert` + `updateTag` | Vitest — mock auth/prisma/cache |
| Presentation | Tabs render, SECRETARY disabled, guard redirects, `useTransition` form | Vitest + RTL — mock session |

## Status

**Phase complete**: Design v2 — all gatekeeper feedback addressed.

## Next: sdd-tasks

Ready for task breakdown. Tracks: Domain+Data, Actions+Cache, Presentation.
