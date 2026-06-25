# Tasks: Payments Module — Data, Actions & Presentation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~830 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 Data → PR #2 Actions → PR #3 Formatters → PR #4 Pages |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Branch | Base |
|------|------|-----------|--------|------|
| 1 | Data layer (Payment repo) | PR #1 | `feature/payments-data` | `main` |
| 2 | `retryPayment` server action | PR #2 | `feature/payments-actions` | `feature/payments-data` |
| 3 | es-AR formatters | PR #3 | `feature/payments-presentation` | `feature/payments-actions` |
| 4 | List + detail pages, 7 components | PR #4 | `feature/payments-pages` | `feature/payments-presentation` |

Dependency diagram: PR #1 → PR #2 → PR #3 → PR #4 → merge to `main`. Tracker branch `feature/payments-tracker` accumulates the chain.

---

## Phase 1: PR #1 — Data Layer (~200 lines)

Branch: `feature/payments-data` (from `main`)

- [x] 1.1 [TEST RED] Write `src/modules/payments/data/__tests__/payment-data.test.ts` — test `getPayments` returns paginated result with `total`, `page`, `pageSize`
- [x] 1.2 [IMPL GREEN] Create `src/modules/payments/data/payment-data.types.ts` with `EnrichedPayment`, `PaymentFilters`, `PaginatedPayments`, `DEFAULT_PAGE_SIZE=20`
- [x] 1.3 [IMPL GREEN] Create `src/modules/payments/data/payment-data.ts` with `PAYMENT_INCLUDE` (4-level nested Prisma include) and `mapToEnrichedPayment` mapper
- [x] 1.4 [IMPL GREEN] Implement `getPayments(orgId, filters?)` — offset pagination via `skip`/`take`, org-scoped `where`
- [x] 1.5 [TEST RED] Add test — `getPayments({ status: "PENDING" })` returns only PENDING payments
- [x] 1.6 [TEST RED] Add test — `getPayments({ search: "maría" })` matches patient name case-insensitive
- [x] 1.7 [IMPL GREEN] Extend `getPayments` with `status` and `search` filters using Prisma `OR` on `booking.patient.user.name` + `booking.professional.user.name`
- [x] 1.8 [TEST RED] Add test — `getPaymentById(orgA, paymentId)` for org-B payment throws `PaymentNotFoundError`
- [x] 1.9 [IMPL GREEN] Implement `getPaymentById(orgId, id)` — single `findFirst` with `PAYMENT_INCLUDE`, throw `PaymentNotFoundError` on miss
- [x] 1.10 [TEST RED] Add test — `retryPayment` increments `retryCount` and resets `status` to `PENDING`
- [x] 1.11 [IMPL GREEN] Implement `retryPayment(orgId, id)` — `findFirst` → `canRetry()` guard → `prisma.payment.update({ retryCount: { increment: 1 }, status: "PENDING" })`
- [x] 1.12 [TEST RED] Add test — `retryPayment` throws `RetryNotAllowedError` when `canRetry()` is `false`
- [x] 1.13 [IMPL GREEN] Add `PaymentNotFoundError` and `RetryNotAllowedError` classes; throw on respective failures
- [x] 1.14 [BARREL] Extend `src/modules/payments/index.ts` with `export * from "./data/payment-data"` and `export * from "./data/payment-data.types"`
- [x] 1.15 [VERIFY] Run `pnpm test` and `pnpm type-check` — all green, no regressions in other modules

---

## Phase 2: PR #2 — Server Actions (~180 lines)

Branch: `feature/payments-actions` (from `feature/payments-data`)

- [x] 2.1 [TEST RED] Write `src/modules/payments/actions/__tests__/retry-payment.test.ts` — test unauthenticated call returns `{ success: false, error: "No autorizado" }`
- [x] 2.2 [IMPL GREEN] Create `src/modules/payments/actions/payment-actions.schema.ts` — `retryPaymentSchema = z.object({ paymentId: z.string().uuid("ID de pago inválido") })`
- [x] 2.3 [IMPL GREEN] Create `src/modules/payments/actions/payment-actions.types.ts` — `PaymentResult<T> = { success: true; data: T } | { success: false; error: string }`
- [x] 2.4 [IMPL GREEN] Create `src/modules/payments/actions/retry-payment.action.ts` with `"use server"` — Zod parse → `auth.api.getSession()` → return "No autorizado" on miss
- [x] 2.5 [TEST RED] Add test — `retryPayment` rejects PROFESSIONAL role with "No autorizado"
- [x] 2.6 [TEST RED] Add test — `retryPayment` rejects PATIENT role with "No autorizado"
- [x] 2.7 [IMPL GREEN] Add RBAC guard — allow only `USER_ROLE.ADMIN` and `USER_ROLE.SECRETARY`
- [x] 2.8 [TEST RED] Add test — `retryPayment({ paymentId: "not-a-uuid" })` returns "ID de pago inválido"
- [x] 2.9 [TEST RED] Add test — `retryPayment` returns "Pago no encontrado" when payment missing in org
- [x] 2.10 [TEST RED] Add test — `retryPayment` returns "No se puede reintentar este pago" when `canRetry()` is false
- [x] 2.11 [IMPL GREEN] Wire `getOrganizationId()` + `getPaymentById` + `retryPayment` data calls; map errors to Spanish messages
- [x] 2.12 [IMPL GREEN] On success: `revalidatePath("/dashboard/payments")` + `revalidatePath("/dashboard/payments/[id]", "page")` + return `{ success: true, data }`
- [x] 2.13 [BARREL] Create `src/modules/payments/actions/index.ts` exporting `retryPayment` and types
- [x] 2.14 [VERIFY] Run `pnpm test` and `pnpm type-check` — all action tests green

---

## Phase 3: PR #3 — Presentation Formatters (~100 lines)

Branch: `feature/payments-presentation` (from `feature/payments-actions`)

- [x] 3.1 [TEST RED] Write `src/modules/payments/presentation/__tests__/formatters.test.ts` — test `getPaymentStatusLabel` returns es-AR label for all 5 statuses
- [x] 3.2 [IMPL GREEN] Create `src/modules/payments/presentation/formatters.ts` with `PAYMENT_STATUS_LABEL` const map (PENDING→"Pendiente", APPROVED→"Aprobado", REJECTED→"Rechazado", CANCELLED→"Cancelado", IN_PROCESS→"En proceso")
- [x] 3.3 [IMPL GREEN] Implement `getPaymentStatusLabel(status: ProviderPaymentStatusType): string` from the map (with "Desconocido" fallback for unknown)
- [x] 3.4 [TEST RED] Add test — `formatCurrency(5000)` returns `"$ 5.000,00"` and `formatCurrency(2500.5)` returns `"$ 2.500,50"`
- [x] 3.5 [IMPL GREEN] Implement `formatCurrency(amount: number): string` using `Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })`
- [x] 3.6 [BARREL] Create `src/modules/payments/presentation/index.ts` exporting formatters
- [x] 3.7 [VERIFY] Run `pnpm test` and `pnpm type-check` — formatter tests green (17 new tests, 1090/1090 total passing)

---

## Phase 4: PR #4 — Pages + Components (~350 lines)

Branch: `feature/payments-pages` (from `feature/payments-presentation`)

- [x] 4.1 [TEST RED] Write `src/components/payments/__tests__/payment-status-badge.test.tsx` — test badge renders correct `variant` per `ProviderPaymentStatus`
- [x] 4.2 [IMPL GREEN] Create `src/components/payments/payment-status-badge.tsx` with shadcn `Badge` — 5-color variant map (yellow/green/red/gray/blue)
- [x] 4.3 [TEST RED] Write `src/components/payments/__tests__/payment-table-skeleton.test.tsx` — test renders 5 shimmer rows
- [x] 4.4 [IMPL GREEN] Create `src/components/payments/payment-table-skeleton.tsx` with 5 skeleton rows matching 7-column layout
- [x] 4.5 [TEST RED] Write `src/components/payments/__tests__/payment-empty-state.test.tsx` — test renders "No hay pagos" message
- [x] 4.6 [IMPL GREEN] Create `src/components/payments/payment-empty-state.tsx` with centered illustration + label
- [x] 4.7 [TEST RED] Write `src/components/payments/__tests__/payment-status-filter.test.tsx` — test selection pushes `?status=` to URL
- [x] 4.8 [IMPL GREEN] Create `src/components/payments/payment-status-filter.tsx` — Client `Select` with 5 statuses + "Todos" default, `router.push` on change
- [x] 4.9 [TEST RED] Write `src/components/payments/__tests__/payment-search-bar.test.tsx` — test debounced (300ms) input pushes `?search=` to URL
- [x] 4.10 [IMPL GREEN] Create `src/components/payments/payment-search-bar.tsx` — Client `Input` with 300ms debounce, `router.push` on settle
- [x] 4.11 [TEST RED] Write `src/components/payments/__tests__/payment-table.test.tsx` — test renders 7 columns and links row to detail page
- [x] 4.12 [IMPL GREEN] Create `src/components/payments/payment-table.tsx` — Client table with columns Fecha reserva / Paciente / Profesional / Servicio / Monto / Estado / Acciones
- [x] 4.13 [TEST RED] Write `src/components/payments/__tests__/payment-detail-card.test.tsx` — test shows retry button when `canRetry()` true, hides when false
- [x] 4.14 [IMPL GREEN] Create `src/components/payments/payment-detail-card.tsx` — Card with all `EnrichedPayment` fields, "Ver reserva" link, retry `Button` (calls `retryPayment` action, shows toast on error)
- [x] 4.15 [IMPL GREEN] Replace `src/app/(dashboard)/dashboard/payments/page.tsx` — Server Component with `Suspense` → `PaymentTableDataWrapper` (async, calls `getPayments(orgId, filters)`) → `PaymentTable` + filter/search bar
- [x] 4.16 [IMPL GREEN] Create `src/app/(dashboard)/dashboard/payments/[id]/page.tsx` — Server Component, `getPaymentById` → `notFound()` on `PaymentNotFoundError`, renders `PaymentDetailCard`
- [x] 4.17 [BARREL] Extend `src/modules/payments/index.ts` with `export * from "./presentation"`
- [x] 4.18 [VERIFY] Run `pnpm test` and `pnpm type-check` — full suite green, pages render under RBAC guard at `(dashboard)` layout

---

## Out of Scope (deferred to `payments-webhook` change)

- MercadoPago webhook route handler
- MercadoPago API integration for retry (retry is local-only)
- Create/edit/delete forms (payments are webhook-driven)
- Decimal migration for `amount` field (Float accepted for MVP)
