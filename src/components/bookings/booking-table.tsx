/**
 * `BookingTable` — the data table for the bookings list page.
 *
 * Renders an `EnrichedBooking[]` as a shadcn/ui Table with columns:
 * Fecha | Hora | Paciente | Profesional | Servicio | Estado | Pago | Monto.
 * Each row links to `/dashboard/bookings/[id]`. The `Estado` column
 * uses `BookingStatusBadge`; the `Pago` column uses
 * `BookingPaymentBadge`.
 *
 * Responsive: the table is hidden on small screens in favor of a
 * stacked card layout. The cards show the same data in a more
 * phone-friendly format.
 *
 * Pagination: when `pageSize < total`, the bottom renders a small
 * "Anterior / Siguiente" pair. The page index is in the URL, so
 * the table is pure — the parent passes the current page down.
 *
 * Pure presentational: no fetching, no auth, no router mutation. The
 * parent page owns data and the URL state.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import {
  formatBookingDate,
  formatBookingTime,
  formatCurrency,
  getPatientDisplayName,
} from "@/modules/bookings/presentation/formatters";

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

import { BookingStatusBadge } from "./booking-status-badge";
import { BookingPaymentBadge } from "./booking-payment-badge";
import { BookingEmptyState } from "./booking-empty-state";

interface BookingTableProps {
  bookings: EnrichedBooking[];
  total: number;
  page: number;
  pageSize: number;
}

export function BookingTable({ bookings, total, page, pageSize }: BookingTableProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function pageHref(p: number): string {
    if (typeof window === "undefined") return "#";
    const params = new URLSearchParams(window.location.search);
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const query = params.toString();
    return query ? `/dashboard/bookings?${query}` : "/dashboard/bookings";
  }

  function rowHref(booking: EnrichedBooking): string {
    return `/dashboard/bookings/${booking.id}`;
  }

  function handleRowActivate(booking: EnrichedBooking) {
    router.push(rowHref(booking));
  }

  if (bookings.length === 0) {
    return <BookingEmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Desktop / tablet — full table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead className="w-[80px]">Hora</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="hidden lg:table-cell">
                Profesional
              </TableHead>
              <TableHead className="hidden lg:table-cell">Servicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Pago</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow
                key={booking.id}
                className="cursor-pointer"
                onClick={() => handleRowActivate(booking)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowActivate(booking);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Ver detalle de ${getPatientDisplayName(booking)}`}
              >
                <TableCell className="font-medium tabular-nums">
                  {formatBookingDate(booking.startTime)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatBookingTime(booking.startTime)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {getPatientDisplayName(booking)}
                  </div>
                  {booking.patient ? (
                    <div className="text-xs text-muted-foreground">
                      {booking.patient.user.email}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {booking.professional.user.name}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {booking.service.name}
                </TableCell>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <BookingPaymentBadge status={booking.paymentStatus} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(booking.service.price)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — card stack */}
      <div className="space-y-2 md:hidden">
        {bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/dashboard/bookings/${booking.id}`}
            className="block"
          >
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {getPatientDisplayName(booking)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBookingDate(booking.startTime)} ·{" "}
                      {formatBookingTime(booking.startTime)} hs
                    </div>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {booking.service.name}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(booking.service.price)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {booking.professional.user.name}
                  </span>
                  <BookingPaymentBadge status={booking.paymentStatus} />
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
            Página {page} de {totalPages} · {total} reservas
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
