/**
 * Public landing / root entry point.
 *
 * Server-rendered landing for Dra. Alejandra Pasqualetti (facial
 * injectables). Replaces the placeholder with a 7-section public
 * marketing page.
 *
 * Auth behavior (preserved from the original placeholder):
 *   - Unauthenticated users see the landing (PUBLIC_PREFIXES includes "/").
 *   - Authenticated non-PATIENT users (ADMIN, SECRETARY, PROFESSIONAL)
 *     are bounced to /dashboard so the operator panel is the first
 *     thing they see.
 *   - PATIENT users stay on this page.
 *
 * The proxy in `src/app/proxy.ts` short-circuits unauthenticated
 * requests to "/" before hitting Better Auth (design AD3 — defense
 * in depth with the PUBLIC_PREFIXES check).
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth-instance";
import { USER_ROLE } from "@/modules/auth/domain/roles";

import { AboutSection } from "./_landing/about-section";
import { BookingCta } from "./_landing/booking-cta";
import { FloatingWhatsApp } from "./_landing/floating-whatsapp";
import { HowItWorksSection } from "./_landing/how-it-works-section";
import { LandingFooter } from "./_landing/landing-footer";
import { LocationsSection } from "./_landing/locations-section";
import { ServicesSection } from "./_landing/services-section";
import { FaqSection } from "./_landing/faq-section";
import { HeroSection } from "./_landing/hero-section";
import {
  aboutData,
  buildJsonLd,
  DEFAULT_ORGANIZATION_ID,
  faqItems,
  getWhatsAppNumber,
  heroData,
  howItWorksSteps,
  landingMetadata,
  locations,
} from "./_landing/data";

const PRACTICE_NAME = "Dra. Alejandra Pasqualetti";
const LOCATION_SUMMARY = "Nuñez, CABA · Pilar, Buenos Aires";

// ---------------------------------------------------------------------------
// Metadata — title, description, OG, canonical. Server-rendered for SEO
// (LND-002).
// ---------------------------------------------------------------------------

export function generateMetadata(): Metadata {
  return {
    title: landingMetadata.title,
    description: landingMetadata.description,
    openGraph: {
      title: landingMetadata.title,
      description: landingMetadata.description,
      url: "/",
      siteName: PRACTICE_NAME,
      images: [
        {
          url: "/placeholder.webp",
          width: 1200,
          height: 630,
          alt: heroData.imageAlt,
        },
      ],
      locale: "es_AR",
      type: "website",
    },
    alternates: {
      canonical: "/",
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function HomePage() {
  // 1. Resolve the session for the role-based redirect (LND-001 /
  //    LND-012 — non-PATIENT must still go to /dashboard).
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    if (role !== USER_ROLE.PATIENT) {
      redirect("/dashboard");
    }
  }

  // 2. Resolve the WhatsApp number from env (with fallback).
  const whatsappNumber = getWhatsAppNumber();

  // 3. Build the JSON-LD payload. Origin is taken from the request
  //    headers; fall back to localhost for build-time rendering.
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const jsonLd = buildJsonLd(whatsappNumber, origin);

  // 4. Render the landing.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main>
        <HeroSection
          name={heroData.name}
          title={heroData.title}
          tagline={heroData.tagline}
          ctaText={heroData.ctaText}
          imageSrc={heroData.imageSrc}
          imageAlt={heroData.imageAlt}
        />
        <AboutSection
          bio={[...aboutData.bio]}
          credentials={aboutData.credentials}
          image={aboutData.image}
          imageAlt={aboutData.imageAlt}
        />
        <ServicesSection
          organizationId={DEFAULT_ORGANIZATION_ID}
          whatsappNumber={whatsappNumber}
          doctorName={PRACTICE_NAME}
        />
        <LocationsSection locations={locations} />
        <HowItWorksSection steps={howItWorksSteps} />
        <FaqSection items={faqItems} />
        <BookingCta
          whatsappNumber={whatsappNumber}
          doctorName={PRACTICE_NAME}
        />
        <LandingFooter
          practiceName={PRACTICE_NAME}
          locationSummary={LOCATION_SUMMARY}
          whatsappNumber={whatsappNumber}
        />
      </main>
      <FloatingWhatsApp
        phoneNumber={whatsappNumber}
        message={`Hola ${PRACTICE_NAME}, quisiera agendar un turno para una consulta.`}
      />
    </>
  );
}
