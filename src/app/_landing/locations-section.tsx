/**
 * Locations section of the public landing.
 *
 * Server Component. Renders two side-by-side cards on desktop, stacked
 * on mobile. Each card shows the practice name, full address, and city
 * (LND-006).
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface LocationItem {
  name: string;
  address: string;
  city: string;
  mapsUrl?: string;
}

export interface LocationsSectionProps {
  locations: readonly LocationItem[];
}

export function LocationsSection({ locations }: LocationsSectionProps) {
  return (
    <section
      aria-labelledby="locations-heading"
      className="border-t border-border bg-background py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 space-y-3 text-center md:mb-16">
          <h2
            id="locations-heading"
            className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            Ubicaciones
          </h2>
          <p className="text-base text-muted-foreground md:text-lg">
            Te atendemos en dos consultorios para que elijas el que te queda
            más cómodo.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {locations.map((loc) => (
            <Card key={loc.name} className="flex flex-col">
              <CardHeader>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {loc.name}
                </h3>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">{loc.address}</p>
                <div className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {loc.city}
                </div>
                {loc.mapsUrl ? (
                  <p className="pt-2">
                    <a
                      href={loc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ver en Google Maps
                    </a>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
