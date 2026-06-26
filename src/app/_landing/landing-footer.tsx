/**
 * Landing footer.
 *
 * Server Component. Renders the practice name, location summary, a
 * WhatsApp contact link, and the copyright. LND-009 (Booking CTA +
 * Footer).
 */

import { MessageCircle } from "lucide-react";

export interface LandingFooterProps {
  practiceName: string;
  /** City / location summary shown as a single line. */
  locationSummary: string;
  whatsappNumber: string;
}

export function LandingFooter({
  practiceName,
  locationSummary,
  whatsappNumber,
}: LandingFooterProps) {
  const year = new Date().getFullYear();
  const href = `https://wa.me/${whatsappNumber}`;

  return (
    <footer
      aria-labelledby="footer-heading"
      className="border-t border-border bg-background"
    >
      <h2 id="footer-heading" className="sr-only">
        Pie de página
      </h2>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            {practiceName}
          </p>
          <p className="text-sm text-muted-foreground">{locationSummary}</p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            Contacto por WhatsApp
          </a>
          <p className="text-xs text-muted-foreground">
            © {year} {practiceName}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
