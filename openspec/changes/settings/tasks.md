# Tasks: Settings — Organization Configuration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2 600 (impl + tests + types + migration) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 5 stacked PRs to main (see table) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

> **Budget note** — PR #1 (~800) and PR #4 (~600) exceed the 400-line budget because they bundle the Prisma+domain foundation (incl. test fixtures) and the two main forms. **Mitigation**: tests live next to the unit they verify (no separate "add tests" commit). If the maintainer refuses the overage, split PR #1 into Schema+Domain / Data and split PR #4 into Business / Bookings (7 PRs total). PR #2/#3/#5 stay under budget as-is.

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Schema + Domain + Data + Migration | PR 1 | `main` | Foundation — Prisma, constants, Zod, types, repository, all unit tests. `pnpm prisma migrate dev` |
| 2 | Server Actions + Cache + Module Barrels | PR 2 | `main` | 3 actions, `SettingsResult<T>`, `"use cache"` wrapper, `updateTag`. Action tests. |
| 3 | RBAC + Sidebar + Page + Tabs UI + Guard | PR 3 | `main` | Roles, sidebar, replace placeholder, `pnpm dlx shadcn@canary add tabs`, `SettingsGuard`. |
| 4 | Business + Bookings Tabs | PR 4 | `main` | Two `useTransition+useState` form tabs, `TimezoneSelect` reused. |
| 5 | Cancellations Tab + Timezone Select (if not in PR 4) | PR 5 | `main` | Last tab + final wiring, full page render, smoke test. |

## Phase 1: PR #1 — Schema + Domain + Data + Migration

- [x] 1.1 [TEST RED] `prisma/schema.prisma` — add `OrganizationSettings` model (uuid, `organizationId` unique+index, 13 fields, defaults matching spec)
- [x] 1.2 [MIGRATE] `pnpm prisma migrate dev --name add_organization_settings`; commit SQL
- [x] 1.3 [TEST RED] `src/modules/settings/domain/__tests__/settings.schema.test.ts` — `SETTINGS_DEFAULTS`, full schema, per-section strict, partial update, unknown-key reject, range/email rejections (RED)
- [x] 1.4 [IMPL GREEN] `src/modules/settings/domain/constants.ts` — `SETTINGS_DEFAULTS` const, `SettingsDefaults` type via `typeof`
- [x] 1.5 [IMPL GREEN] `src/modules/settings/domain/settings.schema.ts` — `organizationSettingsSchema`, `businessConfigSchema` (`.strip()`), `bookingConfigSchema` (`.strip()`), `cancellationConfigSchema` (`.strip()`), `updateSettingsSchema` (`.strict()` partial compose)
- [x] 1.6 [IMPL GREEN] `src/modules/settings/domain/index.ts` barrel — re-export constants + schema
- [x] 1.7 [IMPL GREEN] `src/modules/settings/data/settings-data.types.ts` — `OrganizationSettings`, `OrganizationSettingsInput` (omit `id`/`createdAt`/`updatedAt`), `SettingsRepository` interface
- [x] 1.8 [TEST RED] `src/modules/settings/data/__tests__/settings-data.test.ts` — mock `@/lib/prisma`; `getByOrgId` null/present, `upsert` create/update, scope to `orgId` (RED)
- [x] 1.9 [IMPL GREEN] `src/modules/settings/data/settings-data.ts` — `getByOrgId(orgId)`, `upsertSettings(orgId, data)` via `prisma.organizationSettings.upsert` with `SETTINGS_DEFAULTS` spread
- [x] 1.10 [IMPL GREEN] `src/modules/settings/data/index.ts` barrel
- [x] 1.11 [VERIFY] `pnpm test src/modules/settings`; `pnpm type-check`; `pnpm lint`

## Phase 2: PR #2 — Server Actions + Cache + Module Barrels

- [x] 2.1 [IMPL GREEN] `src/modules/settings/actions/settings-actions.types.ts` — `SettingsResult<T=void>` (mirror `ServiceResult`), Spanish error branch
- [x] 2.2 [IMPL GREEN] `src/modules/settings/actions/settings-actions.schema.ts` — three section schemas with `error` param (Spanish), `updateSettingsSchema` (partial+strict)
- [x] 2.3 [TEST RED] `src/modules/settings/actions/__tests__/update-business.test.ts` — mock `next/headers`, `@/core/auth`, `getOrganizationId`, `next/cache`, `settings-data`; RBAC non-ADMIN rejected, Zod fail, success calls `upsertSettings`+`updateTag("settings")` (RED)
- [x] 2.4 [IMPL GREEN] `src/modules/settings/actions/update-settings.action.ts` — `updateBusiness`, `updateBookings`, `updateCancellations` (each: safeParse → session → ADMIN check → `getOrganizationId` → `upsertSettings` → `updateTag("settings")` → return)
- [x] 2.5 [TEST RED] `src/modules/settings/actions/__tests__/update-bookings.test.ts` + `update-cancellations.test.ts` — same boundaries, different sections
- [x] 2.6 [IMPL GREEN] `src/modules/settings/data/settings-data.ts` — append `getSettings(orgId)` wrapper: `"use cache"` + `cacheTag("settings")` + `cacheLife({ revalidate: 300 })` over `getByOrgId`; mock `next/cache` in tests
- [x] 2.7 [IMPL GREEN] `src/modules/settings/actions/index.ts` barrel — re-export 3 actions, schemas, types
- [x] 2.8 [IMPL GREEN] `src/modules/settings/index.ts` barrel — mirror `services/index.ts` pattern (domain + data + actions)
- [x] 2.9 [VERIFY] `pnpm test`; `pnpm type-check`; `pnpm lint`

## Phase 3: PR #3 — RBAC + Sidebar + Page + Tabs UI + Guard

- [x] 3.1 [TEST RED] `src/modules/auth/domain/__tests__/roles.test.ts` — extend with `settings:manage` (ADMIN), `settings:view` (ADMIN+SECRETARY), PROFESSIONAL/PATIENT neither (RED)
- [x] 3.2 [IMPL GREEN] `src/modules/auth/domain/roles.ts` — add `"settings:manage"` to `ROLE_PERMISSIONS.ADMIN`, `"settings:view"` to `ADMIN` and `SECRETARY`; `PermissionKey` derives via `typeof`
- [x] 3.3 [TEST RED] `src/components/dashboard/__tests__/sidebar.test.tsx` — render with each role; assert Configuración link visibility (SECRETARY added, ADMIN keeps, PROFESSIONAL hidden)
- [x] 3.3 [IMPL GREEN] `src/components/dashboard/sidebar.tsx` — add `USER_ROLE.SECRETARY` to `Configuración` `roles`
- [x] 3.4 [DEPS] `pnpm dlx shadcn@canary add tabs`; verify `src/components/ui/tabs.tsx` exists
- [x] 3.5 [TEST RED] `src/app/(dashboard)/dashboard/settings/__tests__/page.test.tsx` — mock `getOrganizationId` + `getSettings` + `SettingsGuard`; assert tabs render + labels
- [x] 3.5 [IMPL GREEN] `src/app/(dashboard)/dashboard/settings/page.tsx` — RSC; `getOrganizationId` → `getSettings(orgId)` (cached) → render `<SettingsGuard>` → `<Tabs>` (Negocio / Reservas / Cancelaciones) with placeholder content; `SettingsHeader` + `SettingsBody` + `SettingsSkeleton` exported for testability; remove `PlaceholderPage` import
- [x] 3.6 [TEST RED] `src/modules/settings/presentation/__tests__/settings-guard.test.tsx` — mock `next/navigation.redirect`; ADMIN/SECRETARY pass, PROFESSIONAL/PATIENT redirect to `/dashboard` with toast, unauthenticated no-op (RED)
- [x] 3.7 [IMPL GREEN] `src/modules/settings/presentation/settings-guard.tsx` — Client Component; function-as-children; PATIENT/PROFESSIONAL → `toast.error("Acceso denegado")` + `redirect("/dashboard")`; SECRETARY → `readOnly=true`; ADMIN → `readOnly=false`; unauthenticated → `null` (layout handles it)
- [x] 3.8 [IMPL GREEN] `src/modules/settings/presentation/index.ts` barrel — re-exports `SettingsGuard`
- [x] 3.9 [VERIFY] `pnpm test` (1353/1353); `pnpm type-check`; `pnpm lint`

## Phase 4: PR #4 — Business + Bookings Tabs

- [x] 4.1 [IMPL GREEN] `src/modules/settings/presentation/timezone-select.tsx` — native `<select>` with curated IANA list (≥15), `value` + `onChange` props, `disabled` honored
- [x] 4.2 [TEST RED] `src/modules/settings/presentation/__tests__/business-tab.test.tsx` — mock actions + `next/navigation`; pre-fills from props, Zod client validate (email/regex), submit success toast, error inline, `readOnly` disables all fields (RED)
- [x] 4.3 [IMPL GREEN] `src/modules/settings/presentation/tabs/business-tab.tsx` — Client Component, `useTransition+useState`, fields: name, description, address, `<TimezoneSelect>`, phone, email; `safeParse` → `updateBusiness`; Spanish labels
- [x] 4.4 [TEST RED] `src/modules/settings/presentation/__tests__/bookings-tab.test.tsx` — range guards (5–480, 0–168, 1–200, 0–120), submit success, error inline (RED)
- [x] 4.5 [IMPL GREEN] `src/modules/settings/presentation/tabs/bookings-tab.tsx` — Client Component, fields: defaultDurationMinutes, minAdvanceBookingHours, maxBookingsPerDay, bufferMinutes; helper text per range; `updateBookings`
- [x] 4.6 [VERIFY] `pnpm test`; `pnpm type-check`; `pnpm lint`

## Phase 5: PR #5 — Cancellations Tab + Page Wiring

- [x] 5.1 [TEST RED] `src/modules/settings/presentation/__tests__/cancellations-tab.test.tsx` — toggle disables/enables hours field, submit success, error inline (RED)
- [x] 5.2 [IMPL GREEN] `src/modules/settings/presentation/tabs/cancellations-tab.tsx` — Client Component, fields: `cancellationEnabled` (Switch), `cancellationLimitHours` (number, disabled when toggle off); `updateCancellations`
- [x] 5.3 [IMPL GREEN] `src/modules/settings/presentation/settings-page.tsx` — RSC: read cached `getSettings(orgId)`, render `<SettingsGuard>` → `<Tabs>` (Negocio / Reservas / Cancelaciones) → the 3 tab components
- [x] 5.4 [TEST RED] `src/modules/settings/presentation/__tests__/settings-page.test.tsx` — render RSC, three tabs visible, "View-only" banner when SECRETARY, pre-fills from cache
- [x] 5.5 [VERIFY] `pnpm test`; `pnpm type-check`; `pnpm lint`
- [x] 5.6 [SMOKE] Manual: ADMIN login → `/dashboard/settings` → save all 3 tabs → values persist; SECRETARY login → fields disabled, banner visible; PROFESSIONAL → redirect to `/dashboard`
