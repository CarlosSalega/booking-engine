# landing-public Specification

## Purpose
Public landing for Dra. Alejandra Pasqualetti (facial injectables). 7 sections, SEO, responsive, no auth.
**Status**: All PENDING.

## Requirements

### LND-001: Public Access (CRITICAL)
`/` MUST bypass auth. `PUBLIC_PREFIXES` MUST include `"/"`. Proxy matcher MUST exclude `/`.

- **Unauthenticated**: No session, GET `/` → landing renders, no redirect.
- **PATIENT**: PATIENT session, GET `/` → landing renders.
- **Non-PATIENT**: ADMIN/SECRETARY/PROFESSIONAL, GET `/` → redirect `/dashboard`.

### LND-002: SEO Metadata (HIGH)
MUST export metadata: title, 150-160 char description, openGraph (placeholder.webp, website), canonical. JSON-LD `Physician`+`LocalBusiness`. One `<h1>`, `<h2>` per section.

- Tags in `<head>` include title, description, OG, canonical.
- Page source contains valid JSON-LD with both types.
- DOM has single `<h1>`, `<h2>` per section.

### LND-003: Hero Section (HIGH)
`<h1>` full name, subtitle, tagline, CTA "Agendar turno" scrolling to booking section, photo. Responsive.

- Desktop (≥768px): image+text side-by-side, CTA above fold.
- Mobile (<768px): vertical stack.
- CTA click scrolls to final booking section.

### LND-004: About Section (MEDIUM)
"Sobre mí" heading, bio, MN/MP credentials, philosophy, image.

- Bio, credentials, and image displayed.
- Missing credentials → area hidden.

### LND-005: Services Section (HIGH)
Query ACTIVE services from DB. Card: name, description, duration, price (ARS), "Reservar este servicio"→WhatsApp. 2-col desktop. Section hidden if empty.

- Active services render as cards with name, duration, price, WhatsApp CTA.
- Zero active services → section hidden.
- Price formatted ARS (e.g. "$15.000").

### LND-006: Locations Section (MEDIUM)
"Ubicaciones", two cards: Nuñez (CABA)+Pilar (BsAs), address+map placeholder.

- Desktop: two cards side-by-side.
- Mobile (<768px): cards stack vertically.

### LND-007: How It Works (MEDIUM)
3-step flow: (1) Elegí servicio (2) Coordiná turno (3) Visitá consultorio. Icons/numbers.

- 3 steps with icons rendered.
- Mobile (<768px): vertical stack.

### LND-008: FAQ Section (MEDIUM)
6-8 injectables Qs, shadcn Accordion `type="single"`, 2-4 sentence answers.

- All items collapsed initially.
- Opening item B closes item A (single-open).
- Expanded answer shows 2-4 sentences.

### LND-009: Booking CTA + Footer (HIGH)
CTA "Agendá tu consulta", WhatsApp button, pre-filled message. Footer: name, locations, WhatsApp, copyright. Floating WhatsApp fixed bottom-right mobile (≥44×44px).

- WhatsApp button opens with pre-filled message.
- Footer shows name, locations, WhatsApp, copyright.
- Mobile: floating button fixed bottom-right.

### LND-010: Responsive Design (HIGH)
Single-column <768px, typography scales, touch ≥44×44px, no horizontal scroll.

- 375px: single-column, readable, no H-scroll.
- 768px: 2-col grids where specified.
- All interactive elements ≥44×44px on mobile.

### LND-011: Performance (MEDIUM)
Server Component. Client: Accordion+WhatsApp only. Services `"use cache"` 5min TTL. `next/image` lazy. Lighthouse: ≥90 Perf, ≥95 SEO, ≥90 A11y.

- `GET /` returns full HTML, no client JS for content.
- Re-request <5min serves cached data, no DB hit.
- Lighthouse SEO ≥95.

### LND-012: Preservation (CRITICAL)
Non-PATIENT→`/dashboard` MUST persist. All routes unchanged. Proxy additive only: `/` added.

- ADMIN session, GET `/` → redirect `/dashboard`.
- No session, GET `/dashboard` → redirect `/login`.
- `/login`,`/register`,`/api/auth/*`,`/_next/*` bypass auth unchanged.
