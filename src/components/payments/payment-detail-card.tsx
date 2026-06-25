/**
 * `PaymentDetailCard` — the full detail view for a single payment.
 *
 * Renders the payment's enriched data (amount formatted as ARS,
 * provider, status badge, retry count, preference id, external
 * reference, business status, booking info) in a card-based layout.
 * The retry button is a small sub-component that owns the Server
 * Action wiring. A "Ver reserva" link points to the booking detail
 * page, and a parent-child link is rendered for DEPOSIT payments
 * with a `parentPaymentId`.
 *
 * Client Component: the parent page is a Server Component, but the
 * retry button needs `useTransition` + `useRouter` so we land on
 * the client from the top. This lets the data the page passed via
 * props stay serializable through the Server → Client boundary.
 *
 * RBAC scoping: this component does NOT enforce any role check.
 * The Server Component page (`[id]/page.tsx`) calls
 * `getPaymentById(orgId, id)` and 404s when the payment is not in
 * the org. PROFESSIONAL and PATIENT users cannot reach this page
 * at all (dashboard layout redirects them).
 *
 * The `canRetry` prop hides the retry button when the user is not
 * allowed to retry (e.g. PROFESSIONAL role) or when the domain
 * rule `canRetry()` returns false (status=APPROVED or retryCount
 * has reached the cap). The page reads the session role and the
 * domain rule and passes the boolean down — we don't fetch the
 * session from the client.
 */

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Hash,
  KeyRound,
  Link2,
  RefreshCcw,
  Repeat,
  User as UserIcon,
  Users,
} from "lucide-react";

import type { EnrichedPayment } from "@/modules/payments/data/payment-data.types";
import {
  PaymentProvider,
  type PaymentProviderType,
} from "@/modules/payments/domain/payment";
import {
  getPaymentStatusLabel,
  formatCurrency,
} from "@/modules/payments/presentation/formatters";
import { retryPayment } from "@/modules/payments/actions";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { PaymentStatusBadge } from "./payment-status-badge";

interface PaymentDetailCardProps {
  payment: EnrichedPayment;
  canRetry: boolean;
}

const NULL_PLACEHOLDER = "—";

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

const PAYMENT_PROVIDER_LABEL: Record<PaymentProviderType, string> = {
  [PaymentProvider.MERCADOPAGO]: "MercadoPago",
};

export function PaymentDetailCard({
  payment,
  canRetry,
}: PaymentDetailCardProps) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header — back link + payment id + status badge */}
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
            <Link href="/dashboard/payments">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatCurrency(payment.amount)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {getPaymentStatusLabel(payment.status)} · {payment.patientName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={payment.status} />
        </div>
      </div>

      {/* Info cards — 2-column on desktop, single column on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard title="Monto y proveedor">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CreditCard
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="font-medium tabular-nums">
                {formatCurrency(payment.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <KeyRound className="size-3.5" aria-hidden="true" />
              <span>{PAYMENT_PROVIDER_LABEL[payment.provider]}</span>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Estado">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Actual</span>
              <PaymentStatusBadge status={payment.status} />
            </div>
            {canRetry ? (
              <PaymentRetryButton paymentId={payment.id} />
            ) : null}
          </div>
        </InfoCard>

        <InfoCard title="Reserva">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="tabular-nums">
                {DATE_FORMATTER.format(payment.bookingStartTime)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserIcon className="size-3.5" aria-hidden="true" />
              <span>{payment.patientName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-3.5" aria-hidden="true" />
              <span>{payment.professionalName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Hash className="size-3.5" aria-hidden="true" />
              <span>{payment.serviceName}</span>
            </div>
            <div className="pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/bookings/${payment.bookingId}`}>
                  Ver reserva
                </Link>
              </Button>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Estado de negocio">
          <div className="space-y-2 text-sm">
            <p className="font-medium">{payment.businessStatus}</p>
            <p className="text-xs text-muted-foreground">
              Mapeo del estado del proveedor al estado de negocio del
              módulo de servicios.
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Reintentos">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Repeat
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="font-medium tabular-nums">
                {payment.retryCount}
              </span>
              <span className="text-muted-foreground">reintentos</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Incrementado cada vez que se reintenta este pago.
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Identificadores">
          <div className="space-y-2 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Preference ID
              </span>
              <span className="font-mono text-xs">
                {payment.preferenceId ?? NULL_PLACEHOLDER}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Referencia externa
              </span>
              <span className="font-mono text-xs">
                {payment.externalReference ?? NULL_PLACEHOLDER}
              </span>
            </div>
          </div>
        </InfoCard>

        {payment.parentPaymentId ? (
          <div className="md:col-span-2">
            <InfoCard title="Pago relacionado">
              <div className="space-y-2 text-sm">
                <p className="font-medium">Pago hijo</p>
                <p className="text-xs text-muted-foreground">
                  Este pago depende del pago padre. Si el padre es
                  rechazado o cancelado, el hijo no se procesa.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/dashboard/payments/${payment.parentPaymentId}`}
                    className="gap-1.5"
                  >
                    <Link2 className="size-4" aria-hidden="true" />
                    Ver pago padre
                  </Link>
                </Button>
              </div>
            </InfoCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoCard — small wrapper that keeps the info cards visually identical.
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

// ---------------------------------------------------------------------------
// PaymentRetryButton — small sub-component that wires the retry action.
// Mirrors the professionals `ProfessionalStatusChangeDropdown` pattern.
// ---------------------------------------------------------------------------

interface PaymentRetryButtonProps {
  paymentId: string;
}

function PaymentRetryButton({ paymentId }: PaymentRetryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await retryPayment({ paymentId });
        if (result.success) {
          toast.success("Pago reintentado");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("No se pudo reintentar el pago. Intentá de nuevo.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      data-testid="payment-retry-button"
    >
      <RefreshCcw className="size-4" aria-hidden="true" />
      {isPending ? "Reintentando…" : "Reintentar pago"}
    </Button>
  );
}
