# Booking Engine

> Reusable appointment booking engine built with a Specification-Driven Development (SDD) approach.

---

# 1. Purpose

Booking Engine is a production-grade scheduling system designed to manage appointments, professionals, services, payments, and business operations.

It is initially built for a dermatology clinic but designed to be fully reusable across industries.

---

# 2. Key Idea

This project is NOT a traditional web app.

It is a **domain-driven booking engine** composed of modular features defined entirely in `/docs`.

---

# 3. Source of Truth (IMPORTANT)

All system behavior is defined in:

```
/docs
```

This includes:

- Product specification
- Feature definitions
- Architecture rules
- Database schema
- Routing
- Security model

👉 If it's not in `/docs`, it does not exist.

---

# 4. Architecture Philosophy

- Feature-based modules
- Domain-first design
- Server-first approach (Next.js App Router)
- Strict separation of UI and business logic
- Strong typing (TypeScript)
- Minimal and controlled dependencies
- SDD-driven implementation

---

# 5. Tech Stack

## Frontend

- Next.js 16 (App Router)
- React 19
- TypeScript 5.9
- Tailwind CSS v4
- shadcn/ui
- React Hook Form
- Zod
- React Hot Toast (toasts/notifications)

---

## Backend

- Next.js Server Actions
- Route Handlers (API where needed)
- Prisma ORM 7
- PostgreSQL (Neon)

---

## Authentication & Security

- Better Auth
- Role-based access control (RBAC)
- Proxy.ts (Middleware) protection (Next.js)

---

## Infrastructure & Deployment

- Vercel
- Edge-ready architecture (where applicable)

---

## Integrations

- Mercado Pago Checkout Pro
- Cloudinary (media storage)

---

## Testing & Quality

- Vitest
- Testing Library
- ESLint
- Prettier
- TypeScript strict mode

---

## Development Tooling

- Husky (git hooks)
- lint-staged
- nanoID (ID generation)
- slugify

---

# 6. Development Methodology

This project is built using:

- Specification-Driven Development (SDD)
- OpenSpec
- AI-assisted implementation
- Feature-by-feature execution
- Test-aware development

👉 No feature is implemented without its specification in `/docs/features`.

---

# 7. Execution Model (for humans + AI)

When working on this project:

1. Identify the feature
2. Read only the required `/docs`
3. Implement minimal working version
4. Respect domain rules strictly
5. Iterate safely

---

# 8. UI Language Rule (IMPORTANT)

- Code is ALWAYS in English
- UI text is ALWAYS in Spanish (Argentina)

Example:

- "Book appointment"
- "Reservar turno"

---

# 9. System Modules

Core system areas:

- Authentication
- Bookings
- Calendar
- Services
- Professionals
- Patients
- Payments
- Dashboard
- Landing CMS
- Analytics
- Settings

---

# 10. Business Philosophy

The system is designed to:

- Reduce operational friction
- Automate scheduling
- Support payments via Mercado Pago
- Handle real-world clinics and service businesses
- Scale into multi-tenant SaaS in the future

---

# 11. Non-goals (MVP)

The system intentionally avoids:

- Over-engineering
- Microservices
- Complex infra
- Premature SaaS abstraction

---

# 12. Future Vision

The architecture is prepared for:

- Multi-tenant SaaS
- Multi-location businesses
- Subscription models
- Accounting integrations
- Mobile apps
- Public API
- Advanced analytics

---

# 13. Security Principles

- Server-side validation only
- Role-based access control
- Secure authentication via Better Auth
- No trust in frontend
- Audit-friendly architecture

---

# 14. Final Rule

This system is defined by its specifications.

Code is only an implementation detail.

---
