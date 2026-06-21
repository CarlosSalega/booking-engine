/**
 * `WizardStepPayment` — step 5 of the booking wizard.
 *
 * The payment step is a placeholder. The spec says: "shows the
 * service price, payment type (NONE/FULL/DEPOSIT), placeholder for
 * payment". There is no payment integration in MVP — MercadoPago is
 * out of scope for this change.
 *
 * The component receives the service info (name, price, paymentType)
 * from the parent. It does NOT fetch the service — the service was
 * already selected in step 1 and the parent keeps the info in scope.
 *
 * The three payment-type labels match the spec wording:
 * - NONE  → "Pago en el local"
 * - DEPOSIT → "Seña requerida"
 * - FULL  → "Pago completo"
 *
 * The component also renders a small "MercadoPago próximamente" note
 * so the operator understands the integration is on the roadmap.
 */

import { CreditCard, Info } from "lucide-react";

import { formatCurrency } from "@/modules/bookings/presentation/formatters";
import type { PaymentTypeType } from "@/modules/services/domain";

interface WizardStepPaymentProps {
  serviceName: string;
  servicePrice: number;
  paymentType: PaymentTypeType;
}

const PAYMENT_TYPE_LABEL: Record<PaymentTypeType, string> = {
  FULL: "Pago completo",
  DEPOSIT: "Seña requerida",
  NONE: "Pago en el local",
};

export function WizardStepPayment({
  serviceName,
  servicePrice,
  paymentType,
}: WizardStepPaymentProps) {
  return (
    <div className="space-y-4" data-wizard-step-payment>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Servicio</p>
            <p className="text-base font-medium">{serviceName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Precio</p>
            <p className="text-base font-semibold tabular-nums">
              {formatCurrency(servicePrice)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <CreditCard className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">
            {PAYMENT_TYPE_LABEL[paymentType]}
          </p>
        </div>
      </div>

      <div
        className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground"
        role="note"
      >
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          La integración con MercadoPago estará disponible próximamente.
          Por ahora, el pago se gestiona en el consultorio.
        </p>
      </div>
    </div>
  );
}
