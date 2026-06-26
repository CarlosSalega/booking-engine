/**
 * About / Sobre mí section.
 *
 * Server Component. Renders the doctor's bio paragraphs, an optional
 * credentials line, and an optional portrait image. The credentials
 * block is hidden when the prop is missing/empty (LND-004).
 */

import Image from "next/image";

export interface AboutSectionProps {
  bio: string[];
  credentials?: string;
  image?: string;
  imageAlt?: string;
}

export function AboutSection({
  bio,
  credentials,
  image,
  imageAlt = "Dra. Alejandra Pasqualetti",
}: AboutSectionProps) {
  const hasCredentials =
    typeof credentials === "string" && credentials.trim().length > 0;
  const hasImage = typeof image === "string" && image.length > 0;

  return (
    <section
      aria-labelledby="about-heading"
      className="border-t border-border bg-background py-16 md:py-24"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 px-6 md:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <h2
            id="about-heading"
            className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            Sobre mí
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            {bio.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {hasCredentials ? (
            <p className="text-sm font-medium text-foreground md:text-base">
              {credentials}
            </p>
          ) : null}
        </div>
        {hasImage ? (
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-muted">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
