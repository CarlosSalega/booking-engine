/**
 * Booking CTA section — anchor target for the hero CTA (`#booking`).
 *
 * Server Component. Renders a large WhatsApp button with a pre-filled
 * message. Spec scenarios covered: LND-003 (CTA scrolls to booking),
 * LND-009 (final CTA + WhatsApp).
 */

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface BookingCtaProps {
  whatsappNumber: string;
  doctorName: string;
}

export function BookingCta({ whatsappNumber, doctorName }: BookingCtaProps) {
  const message = `Hola ${doctorName}, quisiera agendar un turno para una consulta.`;
  const href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <section
      id="booking"
      aria-labelledby="booking-heading"
      className="border-t border-border bg-muted py-16 md:py-24"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
        <h2
          id="booking-heading"
          className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
        >
          Agendá tu consulta
        </h2>
        <p className="text-base text-muted-foreground md:text-lg">
          Coordiná tu turno por WhatsApp y recibí confirmación inmediata.
        </p>
        <Button asChild size="lg" className="h-12 px-6 text-base">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            <MessageCircle aria-hidden="true" className="size-5" />
            Escribime por WhatsApp
          </a>
        </Button>
      </div>
    </section>
  );
}
