/**
 * `PatientBookingHistory` — a small Client Component that renders
 * the booking history for a patient as a shadcn Table.
 *
 * The bookings come from the page via `EnrichedBooking[]` — the
 * page already filtered them with `getBookings(orgId, { patientId })`.
 * The component reuses the same column vocabulary as the global
 * bookings list (Fecha, Hora, Servicio, Profesional, Estado) so
 * the visual language is consistent. The `Estado` column reuses
 * the bookings `BookingStatusBadge` so the colors match the rest
 * of the app.
 *
 * Empty state: when the array is empty, we render a friendly
 * "Sin turnos registrados" message instead of a table.
 *
 * Pure presentational: no fetching, no auth, no router mutation
 * (the row click uses `window.location` on desktop for simplicity —
 * a real React Router `router.push` would also work; both are
 * acceptable for a non-critical navigation).
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import {
  formatBookingDate,
  formatBookingTime,
} from "@/modules/bookings/presentation/formatters";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";

interface PatientBookingHistoryProps {
  bookings: EnrichedBooking[];
}

export function PatientBookingHistory({ bookings }: PatientBookingHistoryProps) {
  const router = useRouter();

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Sin turnos registrados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Desktop / tablet — full table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="hidden lg:table-cell">
                Profesional
              </TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow
                key={booking.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/dashboard/bookings/${booking.id}`);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Ver detalle del turno ${booking.id}`}
              >
                <TableCell className="font-medium tabular-nums">
                  {formatBookingDate(booking.startTime)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatBookingTime(booking.startTime)} hs
                </TableCell>
                <TableCell>{booking.service.name}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {booking.professional.user.name}
                </TableCell>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
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
              <CardContent className="space-y-1 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium tabular-nums">
                    {formatBookingDate(booking.startTime)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatBookingTime(booking.startTime)} hs
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {booking.service.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {booking.professional.user.name}
                </div>
                <div className="pt-1">
                  <BookingStatusBadge status={booking.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
