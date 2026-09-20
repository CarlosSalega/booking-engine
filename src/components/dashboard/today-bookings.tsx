/**
 * Today's bookings card — table of the next 10 appointments for the
 * current day, with status badge and patient/professional info.
 *
 * Server Component. Renders an empty state when there are no bookings.
 *
 * Slice 2 (ux-audit-fixes): every `STATUS_TONE` value now references
 * the semantic `--status-*` token class defined in `globals.css` (via
 * the Tailwind v4 `@theme inline` `--color-status-*` mapping). CANCELLED
 * and NO_SHOW keep the `destructive` variant mapping — the badge's
 * variant already paints them red (NO_SHOW = real revenue impact) or
 * gray (CANCELLED, D1 supersession). COMPLETED adopts the dark-neutral
 * `--status-completed` token (D1; previously sky blue).
 */

import { CalendarX2 } from "lucide-react";

import {
  getBookingStatusLabel,
  getTodayBookings,
  formatTime,
} from "@/modules/dashboard";
import { BookingStatus } from "@/modules/bookings/domain/booking";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TodayBookingsProps {
  organizationId: string;
}

const STATUS_TONE: Record<string, string> = {
  [BookingStatus.PENDING]:
    "bg-status-pending/15 text-status-pending-foreground",
  [BookingStatus.CONFIRMED]:
    "bg-status-confirmed/15 text-status-confirmed-foreground",
  [BookingStatus.AWAITING_PAYMENT]:
    "bg-status-awaiting-payment/15 text-status-awaiting-payment-foreground",
  [BookingStatus.CANCELLED]: "bg-status-cancelled/15 text-status-cancelled-foreground",
  [BookingStatus.NO_SHOW]: "bg-status-no-show/15 text-status-no-show-foreground",
  [BookingStatus.COMPLETED]:
    "bg-status-completed/15 text-status-completed-foreground",
  [BookingStatus.RESCHEDULED]:
    "bg-status-rescheduled/15 text-status-rescheduled-foreground",
};

export async function TodayBookings({ organizationId }: TodayBookingsProps) {
  const bookings = await getTodayBookings(organizationId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas de hoy</CardTitle>
        <CardDescription>
          Próximos turnos del día en curso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CalendarX2 className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay reservas para hoy.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead className="hidden sm:table-cell">Servicio</TableHead>
                <TableHead className="hidden md:table-cell">
                  Profesional
                </TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium tabular-nums">
                    {formatTime(booking.startTime)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {booking.patient ? booking.patient.user.name : "Invitado"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {booking.patient ? booking.patient.user.email : "Sin paciente registrado"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {booking.service.name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {booking.professional.user.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className={STATUS_TONE[booking.status] ?? ""}
                    >
                      {getBookingStatusLabel(booking.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
