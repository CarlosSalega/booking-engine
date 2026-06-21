/**
 * `BookingDetail` — the full detail view for a single booking.
 *
 * Renders the booking's enriched data (patient, professional, service,
 * schedule, payment, notes) in a card-based layout. The action bar at
 * the bottom is delegated to `BookingDetailActions`, which owns the
 * state-machine-driven button visibility and the Server Action wiring.
 *
 * Client Component (the parent page is a Server Component, but the
 * action bar needs `useTransition` + `useRouter` so we land on the
 * client from the top — this lets the data the page passed via props
 * stay serializable through the Server → Client boundary).
 *
 * RBAC scoping: this component does NOT enforce any role check. The
 * Server Component page (`[id]/page.tsx`) is responsible for
 * PROFESSIONAL ownership: it calls `getBookingById(orgId, id)` and
 * redirects/404s when the booking is not the professional's. The
 * component is role-agnostic; the `role` prop is passed down to the
 * actions sub-component in case the policy evolves to be role-aware.
 *
 * Pure presentational: no data fetching, no auth, no router mutation
 * (except through the actions sub-component).
 */

"use client";

import Link from "next/link";
import { ArrowLeft, Mail, StickyNote, User } from "lucide-react";

import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import type { UserRoleType } from "@/modules/auth/domain/roles";
import {
  formatBookingDate,
  formatBookingTime,
  formatCurrency,
  getPatientDisplayName,
  GUEST_NOTES_PREFIX,
} from "@/modules/bookings/presentation/formatters";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { BookingStatusBadge } from "./booking-status-badge";
import { BookingPaymentBadge } from "./booking-payment-badge";
import { BookingDetailActions } from "./booking-detail-actions";

interface BookingDetailProps {
  booking: EnrichedBooking;
  role: UserRoleType;
}

export function BookingDetail({ booking, role }: BookingDetailProps) {
  const patientName = getPatientDisplayName(booking);
  const isGuest = booking.patient === null;
  const startLabel = formatBookingTime(booking.startTime);
  const endLabel = formatBookingTime(booking.endTime);
  const dateLabel = formatBookingDate(booking.startTime);
  const totalPaid = booking.payments.reduce(
    (sum, p) => sum + (p.status === "PAID" ? p.amount : 0),
    0,
  );

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header — back link + patient name + date/time + badges */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            asChild
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-1"
            aria-label="Volver al listado"
          >
            <Link href="/dashboard/bookings">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Reserva de {patientName}
            </h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              {dateLabel} · {startLabel} hs
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <BookingPaymentBadge status={booking.paymentStatus} />
        </div>
      </div>

      {/* Info cards — 2-column on desktop, single column on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard title="Paciente">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-base font-medium">
              <User className="size-4 text-muted-foreground" aria-hidden="true" />
              {patientName}
            </div>
            {isGuest ? (
              <p className="text-sm text-muted-foreground">
                Reserva de invitado
                {booking.notes?.startsWith(GUEST_NOTES_PREFIX)
                  ? " (datos extraídos de la nota)"
                  : ""}
              </p>
            ) : (
              booking.patient && (
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5" aria-hidden="true" />
                    <span>{booking.patient.user.email}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </InfoCard>

        <InfoCard title="Profesional">
          <div className="space-y-1">
            <div className="text-base font-medium">
              {booking.professional.user.name}
            </div>
            <p className="text-sm text-muted-foreground">
              Profesional asignado
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Servicio">
          <div className="space-y-1">
            <div className="text-base font-medium">{booking.service.name}</div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {booking.service.durationMinutes} min · {formatCurrency(booking.service.price)}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Horario">
          <div className="space-y-1">
            <div className="text-base font-medium tabular-nums">
              {dateLabel}
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {startLabel} hs – {endLabel} hs
            </p>
          </div>
        </InfoCard>

        {/* Payment card — spans both columns on desktop for prominence */}
        <InfoCard title="Pago" className="md:col-span-2">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm text-muted-foreground">Estado</div>
                <div className="text-base font-medium">
                  <BookingPaymentBadge status={booking.paymentStatus} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Monto</div>
                <div className="text-base font-medium tabular-nums">
                  {formatCurrency(booking.service.price)}
                </div>
              </div>
            </div>
            {booking.payments.length > 0 ? (
              <div className="space-y-1 text-sm">
                {booking.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border-t pt-1"
                  >
                    <span className="text-muted-foreground">
                      Pago {payment.status === "PAID" ? "confirmado" : payment.status.toLowerCase()}
                    </span>
                    <span className="tabular-nums">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no se registraron pagos.
              </p>
            )}
            {totalPaid > 0 ? (
              <p className="text-xs text-muted-foreground">
                Total cobrado: {formatCurrency(totalPaid)}
              </p>
            ) : null}
          </div>
        </InfoCard>

        {/* Notes — only when present */}
        {booking.notes ? (
          <InfoCard title="Notas" className="md:col-span-2">
            <div className="flex items-start gap-2 text-sm">
              <StickyNote
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="whitespace-pre-wrap">{booking.notes}</p>
            </div>
          </InfoCard>
        ) : null}
      </div>

      {/* Action bar — always rendered; the sub-component decides whether
          to show buttons based on status. Keeps the layout stable. */}
      <div className="border-t pt-4">
        <BookingDetailActions booking={booking} role={role} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoCard — small wrapper that keeps the four info cards visually identical.
// ---------------------------------------------------------------------------

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function InfoCard({ title, children, className }: InfoCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
