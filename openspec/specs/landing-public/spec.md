# landing-public Specification

## Purpose
Public landing for Dra. Alejandra Pasqualetti (facial injectables). 7 sections, SEO, responsive, no auth.
**Status**: All PENDING.

## Requirements

### Requirement: Public Access
`/` MUST bypass auth. `PUBLIC_PREFIXES` MUST include `"/"`. Proxy matcher MUST exclude `/`.

- **Unauthenticated**: No session, GET `/` → landing renders, no redirect.
- **PATIENT**: PATIENT session, GET `/` → landing renders.
- **Non-PATIENT**: ADMIN/SECRETARY/PROFESSIONAL, GET `/` → redirect `/dashboard`.

### Requirement: SEO Metadata
MUST export metadata: title, 150-160 char description, openGraph (placeholder.webp, website), canonical. JSON-LD `Physician`+`LocalBusiness`. One `<h1>`, `<h2>` per section.

- Tags in `<head>` include title, description, OG, canonical.
- Page source contains valid JSON-LD with both types.
- DOM has single `<h1>`, `<h2>` per section.

### Requirement: Hero Section
`<h1>` full name, subtitle, tagline, CTA "Agendar turno" scrolling to booking section, photo. Responsive.

- Desktop (≥768px): image+text side-by-side, CTA above fold.
- Mobile (<768px): vertical stack.
- CTA click scrolls to final booking section.

### Requirement: About Section
"Sobre mí" heading, bio, MN/MP credentials, philosophy, image.

- Bio, credentials, and image displayed.
- Missing credentials → area hidden.

### Requirement: Services Section
Query ACTIVE services from DB. Card: name, description, duration, price (ARS), "Reservar este servicio"→WhatsApp. 2-col desktop. Section hidden if empty.

- Active services render as cards with name, duration, price, WhatsApp CTA.
- Zero active services → section hidden.
- Price formatted ARS (e.g. "$15.000").

### Requirement: Locations Section
"Ubicaciones", two cards: Nuñez (CABA)+Pilar (BsAs), address+map placeholder.

- Desktop: two cards side-by-side.
- Mobile (<768px): cards stack vertically.

### Requirement: How It Works
3-step flow: (1) Elegí servicio (2) Coordiná turno (3) Visitá consultorio. Icons/numbers.

- 3 steps with icons rendered.
- Mobile (<768px): vertical stack.

### Requirement: FAQ Section
6-8 injectables Qs, shadcn Accordion `type="single"`, 2-4 sentence answers.

- All items collapsed initially.
- Opening item B closes item A (single-open).
- Expanded answer shows 2-4 sentences.

### Requirement: Booking CTA + Footer

CTA "Agendá tu consulta", WhatsApp button, pre-filled message. Footer: name, locations, WhatsApp, copyright. Floating WhatsApp fixed bottom-right mobile (≥44×44px).

The floating WhatsApp CTA MUST consume a semantic brand token pair (e.g. `--whatsapp` / `--whatsapp-hover` or a documented brand token) with a dark-mode-safe treatment instead of raw `green-500` / `green-600` Tailwind palette classes. The token pair MUST be defined in `globals.css` and MUST render with appropriate contrast in both light and dark themes.

- The CTA's background color MUST reference the semantic brand token (not `bg-green-500` or `bg-green-600`).
- The CTA's hover state MUST reference the brand hover token (not `hover:bg-green-600`).
- The CTA MUST have a visible focus ring (`focus-visible:ring-*`) for keyboard accessibility.
- Safe-area and focus-obscure polish (L3) is explicitly deferred to a follow-up change.

- WhatsApp button opens with pre-filled message.
- Footer shows name, locations, WhatsApp, copyright.
- Mobile: floating button fixed bottom-right.

(Previously: The floating WhatsApp CTA used raw Tailwind palette classes `bg-green-500` / `hover:bg-green-600` with no semantic token or dark-mode-safe treatment. Now uses a documented brand token pair defined in `globals.css`.)

#### Scenario: WhatsApp CTA uses semantic brand token
- GIVEN the floating WhatsApp button renders
- WHEN inspecting its className
- THEN the background references a semantic brand token (e.g. `bg-whatsapp` or `bg-[var(--whatsapp)]`)
- AND no raw `green-500` or `green-600` palette class is present

#### Scenario: WhatsApp CTA dark mode safe
- GIVEN the application is in dark mode
- WHEN the floating WhatsApp button renders
- THEN the button is visible with appropriate contrast against the dark background
- AND the color is derived from the semantic token (which has a dark-mode value defined in `globals.css`)

#### Scenario: WhatsApp CTA has focus ring
- GIVEN the floating WhatsApp button
- WHEN focused via keyboard (Tab)
- THEN a visible focus ring is displayed (`focus-visible:ring-*`)
### Requirement: Responsive Design
Single-column <768px, typography scales, touch ≥44×44px, no horizontal scroll.

- 375px: single-column, readable, no H-scroll.
- 768px: 2-col grids where specified.
- All interactive elements ≥44×44px on mobile.

### Requirement: Performance
Server Component. Client: Accordion+WhatsApp only. Services `"use cache"` 5min TTL. `next/image` lazy. Lighthouse: ≥90 Perf, ≥95 SEO, ≥90 A11y.

- `GET /` returns full HTML, no client JS for content.
- Re-request <5min serves cached data, no DB hit.
- Lighthouse SEO ≥95.

### Requirement: Preservation
Non-PATIENT→`/dashboard` MUST persist. All routes unchanged. Proxy additive only: `/` added.

- ADMIN session, GET `/` → redirect `/dashboard`.
- No session, GET `/dashboard` → redirect `/login`.
- `/login`,`/register`,`/api/auth/*`,`/_next/*` bypass auth unchanged.
