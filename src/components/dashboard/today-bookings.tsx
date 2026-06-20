/**
 * Today's bookings card — table of the next 10 appointments for the
 * current day, with status badge and patient/professional info.
 *
 * Server Component. Renders an empty state when there are no bookings.
 */

import { CalendarX2 } from "lucide-react";

import {
  getBookingStatusLabel,
  getTodayBookings,
  formatTime,
} from "@/modules/dashboard";

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
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CONFIRMED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  AWAITING_PAYMENT: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CANCELLED: "bg-destructive/10 text-destructive",
  NO_SHOW: "bg-destructive/10 text-destructive",
  COMPLETED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  RESCHEDULED: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
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
                      {booking.patient.user.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {booking.patient.user.email}
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
