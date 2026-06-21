/**
 * `WizardProgress` — the 6-step indicator at the top of the booking
 * wizard.
 *
 * Renders a horizontal strip of step "chips" (number + label). The
 * current step is highlighted; completed steps render in a secondary
 * highlighted state. The component is a pure function of `currentStep`
 * — it doesn't read the Zustand store directly. The page passes the
 * current step in, which keeps this component trivially testable.
 *
 * The 6 labels match the design's step titles (Argentinian Spanish):
 *   1. Servicio
 *   2. Profesional
 *   3. Horario
 *   4. Cliente
 *   5. Pago
 *   6. Confirmar
 *
 * Visual treatment uses semantic ARIA (`aria-current="step"`,
 * `role="list"`) instead of CSS-class assertions. The visual styling
 * lives in the shadcn/ui Button variant + a few utility classes —
 * not asserted in tests because we don't want to couple tests to
 * visual design.
 */

interface WizardProgressProps {
  /** 1-indexed current step. Defensive clamps to [1, 6]. */
  currentStep: number;
}

const STEP_LABELS = [
  "Servicio",
  "Profesional",
  "Horario",
  "Cliente",
  "Pago",
  "Confirmar",
] as const;

const TOTAL_STEPS = STEP_LABELS.length;

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const safeStep = Math.max(1, Math.min(currentStep, TOTAL_STEPS));

  return (
    <ol
      role="list"
      aria-label="Pasos del wizard"
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      {STEP_LABELS.map((label, idx) => {
        const stepNumber = idx + 1;
        const isCurrent = stepNumber === safeStep;
        const isCompleted = stepNumber < safeStep;

        // Visual class: current is filled, completed is muted filled,
        // upcoming is outlined.
        const toneClass = isCurrent
          ? "bg-primary text-primary-foreground"
          : isCompleted
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground";

        return (
          <li
            key={label}
            data-wizard-step={stepNumber}
            aria-current={isCurrent ? "step" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${toneClass}`}
          >
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium"
            >
              {stepNumber}
            </span>
            <span className="font-medium">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
