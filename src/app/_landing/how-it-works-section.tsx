/**
 * How it works section — 3-step flow (LND-007).
 *
 * Server Component. Renders horizontal layout on desktop, vertical on
 * mobile. Each step shows a numbered circle, title, and description.
 */

export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}

export interface HowItWorksSectionProps {
  steps: readonly HowItWorksStep[];
}

export function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="border-t border-border bg-background py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 space-y-3 text-center md:mb-16">
          <h2
            id="how-it-works-heading"
            className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            Cómo funciona
          </h2>
          <p className="text-base text-muted-foreground md:text-lg">
            Reservar tu turno es muy simple.
          </p>
        </div>
        <ol className="flex flex-col gap-8 md:flex-row md:gap-6">
          {steps.map((s, index) => (
            <li
              key={s.step}
              className="flex flex-1 flex-col items-center text-center md:items-start md:text-left"
            >
              <div className="flex w-full items-center gap-4 md:flex-col md:items-start md:gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
                  aria-hidden="true"
                >
                  {s.step}
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground md:text-xl">
                    {s.title}
                  </h3>
                  <p className="text-sm text-muted-foreground md:text-base">
                    {s.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="mx-6 my-2 h-8 w-px bg-border md:hidden"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
