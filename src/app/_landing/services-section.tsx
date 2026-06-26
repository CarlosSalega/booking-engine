/**
 * Services section of the public landing.
 *
 * Async Server Component with `use cache` + `cacheLife({ revalidate: 300 })`
 * (5 minutes, per design AD2). The component is the single owner of the
 * services query for the landing:
 *
 *   1. Query `getServices(orgId, { status: "ACTIVE", pageSize: 100 })` from
 *      the data layer.
 *   2. If the DB returns zero rows, fall back to the hardcoded catalog in
 *      `./data.ts` (5 services for the MVP).
 *   3. If BOTH are empty, return `null` — the section is hidden (LND-005).
 *
 * Each service renders as a card with name, description, duration, price
 * (ARS, formatted via `Intl.NumberFormat("es-AR")`), and a WhatsApp CTA
 * with a pre-filled message that includes the service name.
 */

import { cacheLife } from "next/cache";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import { getServices } from "@/modules/services/data/service-data";

import { servicesFallback, WHATSAPP_NUMBER_PLACEHOLDER } from "./data";

export interface ServicesSectionProps {
  organizationId: string;
  /** WhatsApp number in international format (e.g. "5491112345678"). */
  whatsappNumber: string;
  /** Practice name used in the pre-filled WhatsApp message. */
  doctorName: string;
}

interface DisplayService {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  /** ARS amount or `null` for "Consultar". */
  price: number | null;
}

const ARS_FORMAT = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatPrice(price: number | null): string {
  return price === null ? "Consultar" : ARS_FORMAT.format(price);
}

function buildWhatsAppUrl(
  number: string,
  doctorName: string,
  serviceName: string,
): string {
  const text = `Hola ${doctorName}, quisiera agendar un turno para ${serviceName}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export async function ServicesSection({
  organizationId,
  whatsappNumber,
  doctorName,
}: ServicesSectionProps) {
  "use cache";
  cacheLife({ revalidate: 300 });

  const { services } = await getServices(organizationId, {
    status: "ACTIVE",
    pageSize: 100,
  });

  const display: DisplayService[] =
    services.length > 0
      ? services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMinutes: s.durationMinutes,
          price: s.price?.amount ?? null,
        }))
      : servicesFallback.map((s, i) => ({
          id: `fallback-${i}`,
          name: s.name,
          description: s.description,
          durationMinutes: s.durationMinutes,
          price: s.price,
        }));

  if (display.length === 0) {
    return null;
  }

  // Fallback to the placeholder when the env var is empty so the
  // service card CTAs still work in dev.
  const number =
    whatsappNumber && whatsappNumber.length > 0
      ? whatsappNumber
      : WHATSAPP_NUMBER_PLACEHOLDER;

  return (
    <section
      aria-labelledby="services-heading"
      className="border-t border-border bg-background py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 space-y-3 text-center md:mb-16">
          <h2
            id="services-heading"
            className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            Servicios
          </h2>
          <p className="text-base text-muted-foreground md:text-lg">
            Tratamientos faciales personalizados. Consultá disponibilidad por
            WhatsApp.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {display.map((service) => (
            <Card key={service.id} className="flex flex-col">
              <CardHeader>
                <h3 className="text-lg font-medium">{service.name}</h3>
                {service.description ? (
                  <CardDescription>{service.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Duración: {service.durationMinutes} minutos
                </p>
                <p className="text-base font-medium text-foreground">
                  {formatPrice(service.price)}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <a
                    href={buildWhatsAppUrl(number, doctorName, service.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reservar este servicio
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
