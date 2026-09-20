# Payments Presentation Specification

## Purpose

UI layer for payment management — list and detail pages. Server Components with Client Component islands for interactivity. All UI labels in Spanish (es-AR). RBAC: PROFESSIONAL and PATIENT roles blocked at layout level.

## Requirements

### Requirement: Payments List Page

Route `/dashboard/payments` SHALL be a Server Component with `<Suspense>` wrapper reading `searchParams`.

- Status filter: `<PaymentStatusFilter>` Client Component dropdown with all `ProviderPaymentStatus` values.
- Search input: `<PaymentSearchBar>` Client Component with debounced input (by booking/patient name).
- Table: `<PaymentTable>` Client Component. 7 columns: "Fecha de reserva", "Paciente", "Profesional", "Servicio", "Monto", "Estado", "Acciones".
- Pagination via `searchParams.page` (1-indexed, default 20).
- Status badge: `<PaymentStatusBadge>` color-coded per `ProviderPaymentStatus`.
- Empty state: `<PaymentEmptyState>` with "No hay pagos" message.
- Loading: `<PaymentTableSkeleton>` shimmer rows in Suspense fallback.
- RBAC: PROFESSIONAL and PATIENT blocked at `(dashboard)` layout.

#### Scenario: List renders payments with filters

- GIVEN 5 payments, URL `/dashboard/payments?status=PENDING&search=maría`
- WHEN page loads
- THEN table shows only PENDING payments matching "maría" via patient name

#### Scenario: Empty state when zero results

- GIVEN search="zzznotfound"
- WHEN page renders
- THEN "No hay pagos" displayed via PaymentEmptyState

#### Scenario: Loading skeleton during Suspense

- GIVEN page is in loading state
- WHEN Suspense fallback renders
- THEN PaymentTableSkeleton shimmer rows shown

### Requirement: Payment Detail Page

Route `/dashboard/payments/[id]` SHALL be a Server Component.

- `getPaymentById(orgId, id)` → throws `PaymentNotFoundError` → `notFound()` (404).
- Detail card: `<PaymentDetailCard>` showing all `EnrichedPayment` fields: amount, status, provider, booking date, patient, professional, service, retryCount, preferenceId, externalReference.
- Status badge: `<PaymentStatusBadge>` with color coding.
- Booking link: "Ver reserva" → `/dashboard/bookings/{bookingId}`.
- Retry button: `<Button variant="destructive">` conditionally shown via `canRetry()`. Action: `retryPayment({ id })`. Shows loading state while executing. On success: page revalidates. On error: toast with error message.
- Parent-child relationship: For DEPOSIT type payments with `parentPaymentId`, show "Pago padre" / "Pago hijo" labels and link to related payment.
- RBAC: retry button hidden for non-ADMIN/SECRETARY.

#### Scenario: Detail renders enriched payment

- GIVEN payment with Booking→Patient:"María", Professional:"Dr. García", Service:"Consulta"
- WHEN `/dashboard/payments/{id}` loads
- THEN detail card shows: amount formatted as ARS, status badge, "María", "Dr. García", "Consulta", "Fecha de reserva", retryCount, "Ver reserva" link

#### Scenario: Detail 404 for nonexistent payment

- GIVEN URL `/dashboard/payments/nonexistent-id`
- WHEN `getPaymentById` throws PaymentNotFoundError
- THEN `notFound()` triggers → 404 page rendered

#### Scenario: Retry button hidden when canRetry false

- GIVEN payment status=APPROVED or retryCount≥3
- WHEN detail page renders
- THEN retry button not rendered

#### Scenario: Retry button triggers action and revalidates

- GIVEN payment status=REJECTED, ADMIN role
- WHEN user clicks "Reintentar"
- THEN `retryPayment` fires → on success page revalidates, status badge updates to PENDING

#### Scenario: Retry button shows error toast on failure

- GIVEN retry not allowed (edge case: state changed between render and click)
- WHEN user clicks "Reintentar"
- THEN `retryPayment` returns error → toast with "No se puede reintentar este pago"

#### Scenario: Detail shows parent-child relationship for DEPOSIT

- GIVEN payment type=DEPOSIT, payment is child (parentPaymentId="p-parent")
- WHEN detail page renders
- THEN "Pago hijo" label shown, link to parent payment detail visible

### Requirement: UI Components

| Component | Type | Description |
|-----------|------|-------------|
| `PaymentTable` | Client | Paginated table with 7 columns, "Acciones" column links to detail |
| `PaymentStatusBadge` | Client | Color-coded badge consuming semantic design tokens: PENDING=`--status-pending`, APPROVED=`--success`, REJECTED=`--destructive`, CANCELLED=`--status-cancelled` (neutral gray), IN_PROCESS=`--info` |
| `PaymentStatusFilter` | Client | Status `<Select>` dropdown, all ProviderPaymentStatus values + "Todos" default |
| `PaymentSearchBar` | Client | Debounced text input (300ms), placeholder "Buscar por paciente..." |
| `PaymentDetailCard` | Server | Card layout with all EnrichedPayment fields, booking link, retry button |
| `PaymentEmptyState` | Server | Centered illustration, "No hay pagos" message |
| `PaymentTableSkeleton` | Server | Shimmer table rows matching 7-column layout |

`PaymentStatusBadge` MUST consume semantic design tokens (`--status-*`, `--success`, `--destructive`, `--info`) rather than raw Tailwind palette classes. No raw palette classes (e.g. `bg-yellow-500`, `bg-green-500`, `bg-red-500`) SHALL be used for status coloring in the badge.

(Previously: `PaymentStatusBadge` used a hardcoded `STATUS_TONE_CLASS` map with raw Tailwind palette values — PENDING=yellow, APPROVED=green, REJECTED=red, CANCELLED=gray, IN_PROCESS=blue. Now uses semantic tokens while preserving the documented status→color intent.)

#### Scenario: PaymentStatusBadge uses semantic tokens
- GIVEN a payment with status=PENDING
- WHEN PaymentStatusBadge renders
- THEN the badge's color classes reference `--status-pending` (not a raw palette class like `bg-yellow-500`)

#### Scenario: Approved payment uses success token
- GIVEN a payment with status=APPROVED
- WHEN PaymentStatusBadge renders
- THEN the badge references `--success` token (not `bg-green-500`)

#### Scenario: Rejected payment uses destructive token
- GIVEN a payment with status=REJECTED
- WHEN PaymentStatusBadge renders
- THEN the badge references `--destructive` token (not `bg-red-500`)

#### Scenario: No raw palette classes in badge
- GIVEN the `payment-status-badge.tsx` source
- WHEN inspected for color class assignments
- THEN no raw Tailwind palette classes are used for status coloring
- AND all status colors reference semantic tokens
### Requirement: Formatters

| Formatter | Signature | Behavior |
|-----------|-----------|----------|
| `getPaymentStatusLabel` | `(status: ProviderPaymentStatusType) → string` | PENDING→"Pendiente", APPROVED→"Aprobado", REJECTED→"Rechazado", CANCELLED→"Cancelado", IN_PROCESS→"En proceso" |
| `formatCurrency` | `(amount: number) → string` | `Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })` |

#### Scenario: Status labels in es-AR

- GIVEN status=PENDING → "Pendiente"
- GIVEN status=APPROVED → "Aprobado"
- GIVEN status=REJECTED → "Rechazado"

#### Scenario: formatCurrency outputs ARS format

- GIVEN amount=5000 → "$ 5.000,00"
- GIVEN amount=2500.5 → "$ 2.500,50"

### Requirement: RBAC Layout Guard

`(dashboard)` layout SHALL block PROFESSIONAL and PATIENT roles from all `/dashboard/payments/*` routes. Individual actions SHALL re-check RBAC before executing mutations.
