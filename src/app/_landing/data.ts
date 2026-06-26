/**
 * Landing page — static content & data helpers.
 *
 * Server-only file (used by Server Components in `src/app/_landing/`).
 * Centralizes all hardcoded copy for the public landing so future
 * migration to a `LandingConfig` model touches a single file.
 *
 * Conventions:
 * - Every export is `const` / frozen; no runtime mutation.
 * - Spanish (Argentina) copy — landing is targeted at AR market.
 * - No React/Next.js imports — this is a pure data module.
 */

// ---------------------------------------------------------------------------
// Organization ID — single-tenant MVP (AD9 from design.md).
// Matches the seed UUID in `prisma/seed.ts`.
// ---------------------------------------------------------------------------

export const DEFAULT_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";

// ---------------------------------------------------------------------------
// WhatsApp number — env-driven with a safe placeholder fallback.
// ---------------------------------------------------------------------------

/**
 * Placeholder fallback used when `WHATSAPP_NUMBER` is unset (local dev,
 * missing env). The landing still renders; WhatsApp CTAs are still
 * clickable but go to a non-routable placeholder number.
 */
export const WHATSAPP_NUMBER_PLACEHOLDER = "5491112345678";

/**
 * Read the WhatsApp Business number from `WHATSAPP_NUMBER`. Returns
 * the placeholder when the env var is missing or empty so the page
 * never crashes in dev.
 */
export function getWhatsAppNumber(): string {
  const raw = process.env["WHATSAPP_NUMBER"];
  if (!raw || raw.trim().length === 0) {
    return WHATSAPP_NUMBER_PLACEHOLDER;
  }
  return raw.trim();
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export const heroData = {
  name: "Dra. Alejandra Pasqualetti",
  title: "Medicina estética facial",
  tagline:
    "Tratamientos de inyectables faciales con resultados naturales, seguros y personalizados.",
  ctaText: "Agendar turno",
  imageSrc: "/placeholder.webp",
  imageAlt:
    "Dra. Alejandra Pasqualetti — especialista en medicina estética facial",
} as const;

// ---------------------------------------------------------------------------
// About / Sobre mí
// ---------------------------------------------------------------------------

export const aboutData = {
  bio: [
    "Soy médica especialista en medicina estética facial. Me dedico a realizar tratamientos de inyectables — toxina botulínica, ácido hialurónico y bioestimuladores — con un enfoque conservador que respeta la anatomía y la expresión de cada paciente.",
    "Creo en los resultados sutiles: que te vean descansada, no distinta. Por eso cada consulta arranca con una evaluación honesta y un plan de tratamiento a medida, sin prometer milagros ni empujar procedimientos que no necesitás.",
  ],
  credentials:
    "Médica (MN) · Especialista en Medicina Estética (MP)",
  image: "/placeholder.webp",
  imageAlt: "Dra. Alejandra Pasqualetti en consultorio",
} as const;

// ---------------------------------------------------------------------------
// Services — fallback when the DB has no ACTIVE services for the org.
// Hardcoded for the MVP per design AD2 / W1 mitigation in tasks.md.
// ---------------------------------------------------------------------------

export interface FallbackService {
  name: string;
  description: string;
  durationMinutes: number;
  /** ARS (Argentine Peso). `null` = "Consultar". */
  price: number | null;
}

export const servicesFallback: readonly FallbackService[] = [
  {
    name: "Toxina botulínica",
    description:
      "Aplicación estratégica para suavizar líneas de expresión y prevenir arrugas dinámicas. Resultados visibles a los 3-7 días.",
    durationMinutes: 30,
    price: 80000,
  },
  {
    name: "Ácido hialurónico — labios",
    description:
      "Hidratación, definición o volumen sutil. Trabajo capa por capa para mantener la naturalidad del gesto.",
    durationMinutes: 45,
    price: 120000,
  },
  {
    name: "Ácido hialurónico — surcos y pómulos",
    description:
      "Reposicionamiento de volúmenes y suavizado de surcos con ácido hialurónico reticulado de última generación.",
    durationMinutes: 60,
    price: 150000,
  },
  {
    name: "Bioestimuladores de colágeno",
    description:
      "Inductores de colágeno ( Sculptra / Radiesse ) para mejorar la calidad de la piel de forma progresiva y duradera.",
    durationMinutes: 45,
    price: 180000,
  },
  {
    name: "Skin boosters",
    description:
      "Micro-inyecciones de ácido hialurónico no reticulado para hidratación profunda y luminosidad.",
    durationMinutes: 30,
    price: 95000,
  },
] as const;

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export interface Location {
  name: string;
  address: string;
  city: string;
  mapsUrl?: string;
}

export const locations: readonly Location[] = [
  {
    name: "Nuñez",
    address: "Av. Cabildo 4000, CABA",
    city: "Ciudad Autónoma de Buenos Aires",
    mapsUrl: "https://maps.google.com/?q=Av.+Cabildo+4000+CABA",
  },
  {
    name: "Pilar",
    address: "Panamericana Km 50, Pilar Centro",
    city: "Provincia de Buenos Aires",
    mapsUrl: "https://maps.google.com/?q=Panamericana+Km+50+Pilar",
  },
] as const;

// ---------------------------------------------------------------------------
// How it works — 3-step flow
// ---------------------------------------------------------------------------

export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}

export const howItWorksSteps: readonly HowItWorksStep[] = [
  {
    step: 1,
    title: "Elegí tu servicio",
    description:
      "Revisá los tratamientos disponibles y elegí el que mejor se adapte a lo que buscás.",
  },
  {
    step: 2,
    title: "Coordiná tu turno",
    description:
      "Escribime por WhatsApp y coordinamos día y horario según tu disponibilidad.",
  },
  {
    step: 3,
    title: "Visitá el consultorio",
    description:
      "Te recibí en Nuñez o Pilar, hacemos la evaluación y arrancamos con el plan.",
  },
] as const;

// ---------------------------------------------------------------------------
// FAQ — 6 injectables questions.
// ---------------------------------------------------------------------------

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: readonly FaqItem[] = [
  {
    question: "¿Los tratamientos de inyectables son dolorosos?",
    answer:
      "La mayoría se tolera muy bien. Uso anestesia tópica en crema cuando el área lo requiere y agujas muy finas. La sesión completa dura entre 30 y 60 minutos y la molestia es leve.",
  },
  {
    question: "¿Cuánto duran los resultados?",
    answer:
      "La toxina botulínica dura entre 4 y 6 meses. El ácido hialurónico entre 9 y 18 meses según la zona y el producto. Los bioestimuladores trabajan durante 2-3 meses y el resultado se mantiene hasta 2 años.",
  },
  {
    question: "¿Cuándo veo los resultados?",
    answer:
      "La toxina se empieza a notar a los 3 días y se asienta a la semana. El ácido hialurónico se ve de inmediato aunque el resultado final se aprecia a los 15 días, cuando baja la inflamación. Los bioestimuladores son progresivos: el cambio real llega al segundo o tercer mes.",
  },
  {
    question: "¿Necesito hacer reposo después?",
    answer:
      "No hay reposo médico, pero recomiendo no hacer ejercicio intenso, no masajear la zona tratada y no exponerse al sol directo por 24-48 horas. Al día siguiente podés retomar tu rutina habitual.",
  },
  {
    question: "¿Cuáles son los riesgos?",
    answer:
      "Son procedimientos seguros cuando los aplica un médico entrenado. Los efectos adversos más comunes son hematomas leves e inflamación transitoria en la zona de aplicación. Te explico todo en la consulta previa y firmamos un consentimiento informado.",
  },
  {
    question: "¿Cómo es la primera consulta?",
    answer:
      "La primera consulta es de evaluación: revisamos tu historia clínica, charlamos sobre lo que te molesta y qué resultado esperás. Te propongo un plan de tratamiento con tiempos, costos y expectativas realistas. Si decidís avanzar, agendamos la sesión.",
  },
  {
    question: "¿Aceptan tarjeta o transferencia?",
    answer:
      "Sí: efectivo, transferencia bancaria y todas las tarjetas. También podés pagar en cuotas según el tratamiento. Lo coordinamos por WhatsApp al momento de reservar.",
  },
  {
    question: "¿Atendés en Nuñez y en Pilar?",
    answer:
      "Sí, atiendo en ambos consultorios. Cuando coordinemos el turno por WhatsApp me decís cuál te queda más cómodo y te paso la dirección exacta.",
  },
] as const;

// ---------------------------------------------------------------------------
// JSON-LD — Physician + LocalBusiness schema.org payload.
// ---------------------------------------------------------------------------

/**
 * Build a JSON-LD payload describing the practice as both a `Physician`
 * and a `LocalBusiness` (the `@graph` array nests both types so a single
 * `<script type="application/ld+json">` covers both).
 *
 * The `whatsappNumber` is embedded as a contact `telephone` so the
 * structured data is consistent with the WhatsApp CTA shown in the UI.
 */
export function buildJsonLd(
  whatsappNumber: string,
  origin: string,
): string {
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Physician",
        "@id": `${origin}/#physician`,
        name: "Dra. Alejandra Pasqualetti",
        description:
          "Medicina estética facial — inyectables faciales con resultados naturales en Nuñez (CABA) y Pilar (Buenos Aires).",
        image: `${origin}/placeholder.webp`,
        url: origin,
        telephone: whatsappNumber,
        medicalSpecialty: "Medicina estética",
        priceRange: "$$",
        address: locations.map((loc) => ({
          "@type": "PostalAddress",
          streetAddress: loc.address,
          addressLocality: loc.name,
          addressRegion: loc.city,
          addressCountry: "AR",
        })),
        openingHours: ["Mo-Fr 09:00-19:00", "Sa 09:00-13:00"],
      },
      {
        "@type": "LocalBusiness",
        "@id": `${origin}/#business`,
        name: "Consultorio Dra. Alejandra Pasqualetti",
        image: `${origin}/placeholder.webp`,
        url: origin,
        telephone: whatsappNumber,
        priceRange: "$$",
        address: locations.map((loc) => ({
          "@type": "PostalAddress",
          streetAddress: loc.address,
          addressLocality: loc.name,
          addressRegion: loc.city,
          addressCountry: "AR",
        })),
        openingHours: ["Mo-Fr 09:00-19:00", "Sa 09:00-13:00"],
      },
    ],
  };
  return JSON.stringify(payload);
}

// ---------------------------------------------------------------------------
// Metadata — title + description for generateMetadata().
// ---------------------------------------------------------------------------

export const landingMetadata = {
  title: "Dra. Alejandra Pasqualetti — Medicina Estética Facial",
  description:
    "Tratamientos de inyectables faciales con resultados naturales en Nuñez (CABA) y Pilar (Buenos Aires). Toxina botulínica, ácido hialurónico y bioestimuladores. Coordiná tu turno por WhatsApp.",
} as const;
