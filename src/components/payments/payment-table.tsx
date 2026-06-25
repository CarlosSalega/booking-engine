/**
 * `PaymentTable` — the data table for the payments list page.
 *
 * Renders an `EnrichedPayment[]` as a shadcn/ui Table with 7 columns:
 * Fecha | Paciente | Profesional | Servicio | Monto | Estado |
 * Acciones. Each row links to `/dashboard/payments/[id]`.
 *
 * The `Estado` column uses `PaymentStatusBadge`; the `Monto` column
 * uses `formatCurrency` for the ARS-formatted amount; the
 * `Profesional` and `Servicio` columns are hidden on small screens
 * in favor of a stacked card layout.
 *
 * Empty state: when `payments.length === 0`, we delegate to
 * `PaymentEmptyState` so the user sees a friendly message.
 *
 * Pure presentational: no fetching, no auth, no router mutation. The
 * parent page owns data and the URL state.
 *
 * Pagination: when `pageSize < total`, the bottom renders a small
 * "Anterior / Siguiente" pair. The page index is in the URL, so
 * the table is pure — the parent passes the current page down.
 */

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { EnrichedPayment } from "@/modules/payments/data/payment-data.types";
import { formatCurrency } from "@/modules/payments/presentation/formatters";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { PaymentStatusBadge } from "./payment-status-badge";
import { PaymentEmptyState } from "./payment-empty-state";

interface PaymentTableProps {
  payments: EnrichedPayment[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Date formatter for the booking's startTime. Uses the es-AR locale
 * so the format is consistent with the rest of the dashboard.
 * Example output: "25/06/2026 14:00".
 */
const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function PaymentTable({
  payments,
  total,
  page,
  pageSize,
}: PaymentTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function pageHref(p: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const query = params.toString();
    return query ? `/dashboard/payments?${query}` : "/dashboard/payments";
  }

  function rowHref(payment: EnrichedPayment): string {
    return `/dashboard/payments/${payment.id}`;
  }

  function handleRowActivate(payment: EnrichedPayment) {
    router.push(rowHref(payment));
  }

  if (payments.length === 0) {
    return <PaymentEmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Desktop / tablet — full table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="hidden md:table-cell">Profesional</TableHead>
              <TableHead className="hidden md:table-cell">Servicio</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow
                key={payment.id}
                className="cursor-pointer"
                onClick={() => handleRowActivate(payment)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowActivate(payment);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Ver detalle de ${payment.patientName}`}
              >
                <TableCell className="font-medium tabular-nums">
                  {DATE_FORMATTER.format(payment.bookingStartTime)}
                </TableCell>
                <TableCell>{payment.patientName}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {payment.professionalName}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {payment.serviceName}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatCurrency(payment.amount)}
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={payment.status} />
                </TableCell>
                <TableCell>
                  <Link
                    href={rowHref(payment)}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver detalle
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — card stack */}
      <div className="space-y-2 md:hidden">
        {payments.map((payment) => (
          <Link
            key={payment.id}
            href={rowHref(payment)}
            className="block"
          >
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{payment.patientName}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {DATE_FORMATTER.format(payment.bookingStartTime)}
                    </div>
                  </div>
                  <PaymentStatusBadge status={payment.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span>{payment.professionalName}</span>
                  <span>·</span>
                  <span>{payment.serviceName}</span>
                </div>
                <div className="text-sm font-medium tabular-nums">
                  {formatCurrency(payment.amount)}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-2 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {total} pagos
          </span>
          <div className="flex items-center gap-2">
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrev}
            >
              <Link
                href={hasPrev ? pageHref(page - 1) : "#"}
                aria-disabled={!hasPrev}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Link>
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNext}
            >
              <Link
                href={hasNext ? pageHref(page + 1) : "#"}
                aria-disabled={!hasNext}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
