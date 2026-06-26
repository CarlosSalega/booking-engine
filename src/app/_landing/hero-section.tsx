/**
 * Hero section of the public landing.
 *
 * Server Component. The `<h1>` is rendered here (LND-002: single `<h1>`
 * per page). The CTA is an `<a href="#booking">` that scrolls to the
 * booking section at the bottom of the page.
 */

import Image from "next/image";

import { Button } from "@/components/ui/button";

export interface HeroSectionProps {
  name: string;
  title: string;
  tagline: string;
  ctaText: string;
  imageSrc: string;
  imageAlt: string;
}

export function HeroSection({
  name,
  title,
  tagline,
  ctaText,
  imageSrc,
  imageAlt,
}: HeroSectionProps) {
  return (
    <section
      aria-labelledby="hero-name"
      className="bg-background py-16 md:py-24"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
        <div className="space-y-6">
          <h1
            id="hero-name"
            className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl"
          >
            {name}
          </h1>
          <p className="text-xl text-muted-foreground md:text-2xl">{title}</p>
          <p className="text-base text-muted-foreground md:text-lg">
            {tagline}
          </p>
          <div className="pt-2">
            <Button asChild size="lg">
              <a href="#booking">{ctaText}</a>
            </Button>
          </div>
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
