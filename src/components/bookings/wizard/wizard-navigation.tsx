/**
 * `WizardNavigation` — the prev/next/cancel button bar at the bottom
 * of the booking wizard.
 *
 * Pure presentational: receives the current step + a "can advance"
 * boolean + an "is submitting" boolean, and emits `onPrev` / `onNext`
 * / `onCancel` callbacks. State management and side effects live in
 * the page; this component is the visual adapter.
 *
 * Layout:
 * - Step 1: [Cancelar] on the left, [Siguiente] on the right.
 * - Steps 2–5: [Cancelar] [Anterior] on the left, [Siguiente] on the
 *   right.
 * - Step 6: [Cancelar] [Anterior] on the left, [Crear reserva]
 *   (submit) on the right. The submit button is disabled while
 *   `isSubmitting` is true and shows a "Creando..." label.
 *
 * Accessibility:
 * - Buttons use semantic `<button type="button">` (not submit by
 *   accident — the wizard doesn't use a native form).
 * - Disabled state uses the `disabled` attribute (not `aria-disabled`)
 *   so the button is also non-focusable.
 */

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WizardNavigationProps {
  currentStep: number;
  /** When `false`, "Siguiente" / "Crear reserva" are disabled. */
  canAdvance: boolean;
  /** When `true`, every button is disabled + the submit shows a spinner. */
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCancel: () => void;
}

export function WizardNavigation({
  currentStep,
  canAdvance,
  isSubmitting,
  onPrev,
  onNext,
  onCancel,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === 6;

  return (
    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={isSubmitting}
          >
            <ArrowLeft className="size-4" />
            Anterior
          </Button>
        )}
      </div>

      {isLastStep ? (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canAdvance || isSubmitting}
          data-wizard-action="submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creando reserva…
            </>
          ) : (
            <>
              <Check className="size-4" />
              Crear reserva
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          data-wizard-action="next"
        >
          Siguiente
          <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
