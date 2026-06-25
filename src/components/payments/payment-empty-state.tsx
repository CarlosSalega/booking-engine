/**
 * `PaymentEmptyState` — shown when `getPayments` returns an empty
 * array (either because the org has no payments yet, or because the
 * active filter narrowed the set to nothing). Renders a centered
 * illustration + a friendly Spanish message.
 *
 * Server-renderable (no hooks, no events). Marked "use client" so
 * it can be safely used inside a Client parent (the `PaymentTable`
 * delegates to it when the array is empty). The component itself
 * has no client-side state — it's a pure render.
 */

import { CreditCard } from "lucide-react";

export function PaymentEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      data-testid="payment-empty-state"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <CreditCard className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No hay pagos</p>
        <p className="text-xs text-muted-foreground">
          Cuando se registren pagos, aparecerán acá.
        </p>
      </div>
    </div>
  );
}
