# Tasks: Services Module — Application & Presentation Layers

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
Delivery strategy: force-chained
Estimated: ~1430 lines, 4 PRs (350/350/350/380), base=main, tests in same PR.

## Phase 1: PR #1 — Migration + Data Layer

- [x] 1.1 [TEST RED] `src/modules/services/data/__tests__/service-data.test.ts` — 4 mocked-Prisma describes: getServices, getServiceById, createService, updateService
- [x] 1.2 [IMPL GREEN] Add `depositAmount Float?` to `Service` in `prisma/schema.prisma` after `price`
- [x] 1.3 [MIGRATE] `pnpm prisma migrate dev --name add_service_deposit_amount`; commit SQL
- [x] 1.4 [IMPL GREEN] `src/modules/services/data/service-data.types.ts` — `DEFAULT_PAGE_SIZE=20`, `ServiceFilters`, `PaginatedServices`, `EnrichedService extends Service {professionalId, professionalName}`, `CreateServiceInput`, `UpdateServiceInput`
- [x] 1.5 [IMPL GREEN] `src/modules/services/data/service-data.ts` — `SERVICE_INCLUDE` (professional.user.name), `mapToEnrichedService` ARS-hardcoded, 4 funcs, `ServiceNotFoundError` on missing update
- [x] 1.6 [VERIFY] `pnpm test src/modules/services/data`; lint; type-check

## Phase 2: PR #2 — Server Actions

- [x] 2.1 [TEST RED] `src/modules/services/actions/__tests__/create-service.test.ts` — mock auth/headers/getOrganizationId/revalidatePath/data; RBAC PROFESSIONAL+PATIENT rejected, ADMIN/SECRETARY success
- [x] 2.2 [IMPL GREEN] `src/modules/services/actions/service-actions.schema.ts` — 3 Zod 4 schemas with `error` param (Spanish messages, cross-field superRefine for DEPOSIT)
- [x] 2.3 [IMPL GREEN] `src/modules/services/actions/service-actions.types.ts` — `ServiceResult<T=void>` union, inputs via `z.infer`
- [x] 2.4 [IMPL GREEN] `src/modules/services/actions/create-service.action.ts` — Zod → session+orgId → reject PROFESSIONAL/PATIENT → data createService → revalidate → `ServiceResult<{id}>`
- [x] 2.5 [TEST RED] `src/modules/services/actions/__tests__/update-service.test.ts` — RBAC, Zod fail, wrong-org→"Servicio no encontrado", partial success, P2025
- [x] 2.6 [IMPL GREEN] `src/modules/services/actions/update-service.action.ts` — Zod → session → RBAC → getServiceById null→"Servicio no encontrado" → data updateService → catch P2025 → revalidate
- [x] 2.7 [TEST RED] `src/modules/services/actions/__tests__/change-service-status.test.ts` — RBAC, not-found, ACTIVE↔INACTIVE any transition, bad enum
- [x] 2.8 [IMPL GREEN] `src/modules/services/actions/change-service-status.action.ts` — Zod → session → RBAC → getServiceById → prisma.service.update({status}) → revalidate
- [x] 2.9 [IMPL GREEN] `src/modules/services/actions/index.ts` barrel — re-export actions + schemas + types
- [x] 2.10 [VERIFY] `pnpm test` (659/659) + `pnpm type-check` (clean) + `pnpm lint` (clean)

## Phase 3: PR #3 — List Page + Components

- [ ] 3.1 [TEST RED] `src/modules/services/presentation/__tests__/formatters.test.ts` — getServiceStatusLabel, getPaymentTypeLabel, formatPrice ARS
- [ ] 3.2 [IMPL GREEN] `src/modules/services/presentation/formatters.ts` + `index.ts` — Spanish labels, `formatPrice` returns `$ 2.000,00`
- [ ] 3.3 [TEST RED] `src/components/services/__tests__/service-status-badge.test.tsx` — variant map + label render
- [ ] 3.4 [IMPL GREEN] `service-status-badge.tsx` — variant map (ACTIVE=default, INACTIVE=secondary) + shadcn Badge Client Component
- [ ] 3.5 [TEST RED] `__tests__/service-table.test.tsx` — rows, links, empty-state, professional, price, badge
- [ ] 3.6 [IMPL GREEN] `service-table.tsx` — shadcn Table columns Nombre/Profesional/Duración/Precio/Estado, pagination, PROFESSIONAL hides actions
- [ ] 3.7 [IMPL GREEN] `service-table-skeleton.tsx`, `service-search-bar.tsx`, `service-status-filter.tsx`, `service-professional-filter.tsx`, `service-empty-state.tsx`
- [ ] 3.8 [IMPL GREEN] Replace `src/app/(dashboard)/dashboard/services/page.tsx` — Server Component, `searchParams: Promise`, `parseFilters`, header + filters, `<Suspense key={filters}>` → data wrapper → getServices + ServiceTable
- [ ] 3.9 [IMPL GREEN] Update `src/modules/services/index.ts` — export data, actions, presentation (mirror patients barrel)
- [ ] 3.10 [VERIFY] `pnpm test src/components/services src/modules/services/presentation`; type-check

## Phase 4: PR #4 — Detail + Create + Edit Pages

- [ ] 4.1 [TEST RED] `__tests__/service-form.test.tsx` — Zod 4 client validation, depositAmount conditional on DEPOSIT, submit, success redirect, error inline
- [ ] 4.2 [IMPL GREEN] `service-form.tsx` — Client Component, `useActionState`, conditional depositAmount, `useRouter().replace()` on success, error banner
- [ ] 4.3 [IMPL GREEN] `service-detail-card.tsx` — name, description, duration, formatPrice, status + payment-type badges, profesional, Edit button (hidden PROFESSIONAL)
- [ ] 4.4 [IMPL GREEN] `src/app/(dashboard)/dashboard/services/[id]/page.tsx` — await params → getOrganizationId → getServiceById null→notFound → ServiceDetailCard
- [ ] 4.5 [IMPL GREEN] `new/page.tsx` — fetch org professionals → render `<ServiceForm mode="create" professionals={...} />`
- [ ] 4.6 [IMPL GREEN] `[id]/edit/page.tsx` — getServiceById null→notFound → fetch professionals → render `<ServiceForm mode="edit" service={...} professionals={...} />`
- [ ] 4.7 [VERIFY] `pnpm test` all green; lint; type-check; manual list→create→edit→detail→status
