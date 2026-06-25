/**
 * `/dashboard/payments` — operator-facing list of all payments.
 *
 * Server Component. Reads `searchParams` (Next.js 16 still exposes
 * them as a `Promise` in this version of the App Router) and fans
 * out a single data fetch in parallel with the page header / filters.
 *
 * RBAC: the dashboard layout already redirects PATIENT users. The
 * data layer (`getPayments`) is org-scoped via `getOrganizationId()`,
 * so cross-tenant data never reaches the UI. PROFESSIONAL users see
 * the read-only list (per AD7 — payments are admin/secretary-only).
 *
 * Composition: the page renders the header, the search bar, the
 * status filter, and a Suspense boundary around the data wrapper.
 * The wrapper does the actual `getPayments` call so the rest of the
 * page (header, search, filters) streams immediately while the table
 * is still loading. The skeleton is shown during the streaming.
 */

import { Suspense } from "react";

import { getOrganizationId } from "@/modules/dashboard";
import {
  getPayments,
  ProviderPaymentStatus,
  type ProviderPaymentStatusType,
} from "@/modules/payments";
import type { PaymentFilters } from "@/modules/payments/data/payment-data.types";
import { DEFAULT_PAGE_SIZE } from "@/modules/payments/data/payment-data.types";

import { PaymentTable } from "@/components/payments/payment-table";
import { PaymentTableSkeleton } from "@/components/payments/payment-table-skeleton";
import { PaymentSearchBar } from "@/components/payments/payment-search-bar";
import { PaymentStatusFilter } from "@/components/payments/payment-status-filter";

interface PaymentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const ALL_STATUSES: ProviderPaymentStatusType[] = [
  ProviderPaymentStatus.PENDING,
  ProviderPaymentStatus.APPROVED,
  ProviderPaymentStatus.REJECTED,
  ProviderPaymentStatus.CANCELLED,
  ProviderPaymentStatus.IN_PROCESS,
];

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  const params = await searchParams;
  const organizationId = await getOrganizationId();
  const filters = parseFilters(params);

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Registro y seguimiento de pagos de turnos.
        </p>
      </div>

      {/* Search bar + status filter */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:gap-4 lg:px-6">
        <PaymentSearchBar />
        <PaymentStatusFilter />
      </div>

      {/* Table data — Suspense streams the table in once the data resolves */}
      <div className="px-4 lg:px-6">
        <Suspense
          key={JSON.stringify(filters)}
          fallback={<PaymentTableSkeleton rows={5} />}
        >
          <PaymentsTableDataWrapper
            organizationId={organizationId}
            filters={filters}
          />
        </Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Data wrapper — async server component that calls getPayments. Lives
// inside <Suspense> so the rest of the page streams while it resolves.
// ---------------------------------------------------------------------------

async function PaymentsTableDataWrapper({
  organizationId,
  filters,
}: {
  organizationId: string;
  filters: PaymentFilters;
}) {
  const result = await getPayments(organizationId, filters);
  return (
    <PaymentTable
      payments={result.payments}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses the URL searchParams into a `PaymentFilters` object.
 * - `status` is a single string, validated against ProviderPaymentStatus values
 * - `page` has a default of 1
 * - `search` is passed through as-is
 */
function parseFilters(
  params: Record<string, string | string[] | undefined>,
): PaymentFilters {
  const get = (k: string): string | undefined => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const pageStr = get("page");
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const statusRaw = get("status");
  const status =
    statusRaw && (ALL_STATUSES as string[]).includes(statusRaw)
      ? (statusRaw as ProviderPaymentStatusType)
      : undefined;

  return {
    search: get("search"),
    status,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}
