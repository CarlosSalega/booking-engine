"use client";

/**
 * `WizardStepConfirm` — step 6 of the booking wizard.
 *
 * Renders a read-only summary of all the selections (service,
 * professional, schedule, customer) and a "Confirmar y crear reserva"
 * button that calls `onSubmit`. The submit itself is owned by the
 * page — this component is purely presentational.
 *
 * Layout: 4 cards in a 2-column grid (1-column on mobile), plus the
 * submit button. The error alert renders above the button so the
 * user sees it without scrolling.
 *
 * The summary data is passed in by the parent — the component does
 * NOT read the store. This keeps the component testable without a
 * Zustand setup.
 */

import { AlertCircle, Calendar, Clock, Loader2, User } from "lucide-react";

import {
  formatCurrency,
  formatPaymentType,
} from "@/modules/bookings/presentation/formatters";
import type {
  PatientOption,
  ProfessionalOption,
  ServiceOption,
} from "@/modules/bookings/data/booking-data.types";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardStepConfirmProps {
  service: ServiceOption;
  professional: ProfessionalOption;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24h) */
  startTime: string;
  /** HH:MM (24h) */
  endTime: string;
  isGuest: boolean;
  patient: PatientOption | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: () => void;
}

function formatDate(iso: string): string {
  // YYYY-MM-DD → Date at midnight local. The Intl formatter renders
  // the date in the runtime's TZ (es-AR → dd/mm/yyyy).
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function WizardStepConfirm({
  service,
  professional,
  date,
  startTime,
  endTime,
  isGuest,
  patient,
  guestName,
  guestPhone,
  guestEmail,
  isSubmitting,
  error,
  onSubmit,
}: WizardStepConfirmProps) {
  return (
    <div className="space-y-4" data-wizard-step-confirm>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryCard label="Servicio" icon={Calendar}>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{service.name}</p>
            <p className="text-xs text-muted-foreground">
              {service.durationMinutes} min · {formatCurrency(service.price)} ·{" "}
              {formatPaymentType(service.paymentType)}
            </p>
          </div>
        </SummaryCard>

        <SummaryCard label="Profesional" icon={User}>
          <p className="text-sm font-medium">{professional.user.name}</p>
        </SummaryCard>

        <SummaryCard label="Horario" icon={Clock}>
          <p className="text-sm font-medium tabular-nums">{formatDate(date)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {startTime} – {endTime} hs
          </p>
        </SummaryCard>

        <SummaryCard label="Cliente" icon={User}>
          {isGuest ? (
            <div className="space-y-0.5 text-sm">
              <p className="font-medium">Invitado: {guestName}</p>
              <p className="text-xs text-muted-foreground">
                Tel: {guestPhone}
                {guestEmail ? ` · ${guestEmail}` : ""}
              </p>
            </div>
          ) : patient ? (
            <div className="space-y-0.5 text-sm">
              <p className="font-medium">{patient.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {patient.user.email}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin paciente seleccionado
            </p>
          )}
        </SummaryCard>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <p className="text-destructive">{error}</p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          data-wizard-action="confirm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creando reserva…
            </>
          ) : (
            "Confirmar y crear reserva"
          )}
        </Button>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}

function SummaryCard({ label, icon: Icon, children, className }: SummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
