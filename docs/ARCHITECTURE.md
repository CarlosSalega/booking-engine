# ARCHITECTURE.md

# Architecture

> **Booking Engine** follows a **Feature-Based Modular Architecture** with a **Domain-First** mindset, leveraging the strengths of Next.js App Router, React Server Components, Server Actions, and PostgreSQL.

This document defines the architectural decisions of the project. Every contributor and AI agent should follow these conventions unless there is a documented Architecture Decision Record (ADR) that explicitly changes them.

---

# Goals

The architecture is designed to achieve the following goals:

- High maintainability
- High cohesion
- Low coupling
- Excellent developer experience
- Reusable business logic
- Scalability
- Testability
- Server-first rendering
- Performance
- Future SaaS compatibility

The MVP should never compromise future scalability.

---

# Core Principles

## Domain First

Business rules are the most valuable asset of the application.

UI must never contain business logic.

Examples:

❌ Wrong

- Validate appointment duration inside a React component.

✅ Correct

- Validate duration inside the booking domain.

---

## Feature-Based Modules

The project is organized by business capabilities instead of file types.

Instead of:

```
components/
hooks/
services/
pages/
```

We organize around features:

```
booking/
appointments/
patients/
services/
dashboard/
cms/
```

Each feature owns its:

- components
- server actions
- validation
- repositories
- services
- tests
- types

This greatly reduces coupling.

---

## High Cohesion

Everything related to Booking belongs inside Booking.

Everything related to Patients belongs inside Patients.

Avoid "shared" unless the code is truly reusable.

---

## Low Coupling

Modules communicate through explicit interfaces.

A module should never depend on another module's internal implementation.

---

## Server First

Default to Server Components.

Only use Client Components when necessary.

Examples:

Good candidates for Client Components:

- Forms
- Calendar interactions
- Drag & Drop
- Search
- Charts
- Modals
- Toasts

Everything else should remain server-rendered.

---

# Architectural Layers

Each feature follows a simplified layered architecture.

```
UI

↓

Application

↓

Domain

↓

Infrastructure

↓

Database
```

---

## UI Layer

Responsible for:

- Rendering
- User interaction
- Forms
- Tables
- Visual feedback

Never:

- Query database directly
- Contain business rules
- Know persistence details

---

## Application Layer

Coordinates use cases.

Examples:

Create Appointment

- validate input
- check availability
- create appointment
- send notification
- revalidate cache

Application layer orchestrates.

It does not implement business rules.

---

## Domain Layer

Contains:

- Business rules
- Policies
- Calculations
- Validations
- Domain services

This is the heart of the application.

---

## Infrastructure Layer

Responsible for:

- Database
- Email
- External APIs
- Storage
- Authentication integration

Infrastructure never contains business logic.

---

# Folder Structure

Proposed structure:

```
src/

app/

components/

features/

lib/

config/

styles/

types/
```

---

## App

Contains routing only.

Example:

```
app/

(page)

dashboard/

booking/

login/

api/
```

App Router should remain thin.

---

## Features

Every business capability lives here.

Example

```
features/

auth/

appointments/

booking/

calendar/

cms/

dashboard/

patients/

professionals/

services/

statistics/

reports/

settings/
```

Each feature owns its implementation.

---

Example

```
booking/

components/

actions/

schemas/

repositories/

services/

types/

hooks/

utils/

tests/
```

---

# Shared Code

Use shared only for code reused by multiple modules.

Examples

```
components/ui

lib/db

lib/auth

lib/env

lib/logger
```

Avoid dumping everything into shared.

---

# Server Actions

Server Actions are the default mutation mechanism.

Use Server Actions when:

- authenticated user
- forms
- dashboard
- CRUD
- mutations

Examples

Create Service

Update Patient

Delete Appointment

Publish Landing

---

Advantages

- Type-safe
- No REST boilerplate
- Better DX
- Integrated with Next.js

---

# API Routes

API Routes exist only when required.

Examples

Webhook

Calendar integrations

Public API

Mobile application

Third-party integrations

File uploads

Everything else should prefer Server Actions.

---

# React Server Components

Default component type.

Benefits

- zero JS
- streaming
- security
- performance

Never convert entire pages into client components.

Move only the interactive section.

---

# Client Components

Use only when necessary.

Examples

Calendar

Date Picker

Rich Text Editor

Chart

Toast

Search

Infinite Scroll

Everything else stays server.

---

# Validation

Validation happens in three levels.

## Client

UX only.

Required fields.

Instant feedback.

Never trusted.

---

## Server

Every request.

Always.

---

## Database

Constraints.

Unique indexes.

Foreign keys.

Check constraints.

---

# Authentication

Better Auth.

Email/password for MVP.

Future

OAuth

Magic links

MFA

Passkeys

Architecture should support them.

---

# Authorization

RBAC.

Roles

Administrator

Secretary

Professional

Patient

Authorization always happens server-side.

Never trust client role.

---

# Database Access

All database access goes through repositories.

Example

```
AppointmentRepository

PatientRepository

ProfessionalRepository
```

Never query database directly inside components.

---

# Services

Services implement business operations.

Example

BookingService

Responsibilities

check availability

validate duration

reserve slot

calculate totals

Repositories only persist.

Services think.

---

# DTOs

Never expose raw database models.

Use DTOs between layers.

Benefits

- decoupling
- security
- easier evolution

---

# Error Handling

Expected errors

Validation

Business rules

Unauthorized

Conflict

Unexpected errors

Database

Infrastructure

Unknown exceptions

Never expose internal stack traces.

---

# Logging

Every important operation should be logged.

Examples

Appointment cancelled

Appointment created

Service removed

Professional disabled

Future

Audit log

---

# Caching

Next.js cache.

Use

revalidatePath()

revalidateTag()

Future

Redis

---

# File Uploads

Images

Professional photos

Landing assets

Future

Documents

Medical reports

Invoices

Storage provider should remain abstract.

---

# Notifications

Current

Email

Future

WhatsApp

SMS

Push

Architecture should support multiple providers.

Use adapters.

---

# Feature Flags

Prepare infrastructure.

Future

Enable

Coupons

Payments

Reports

Public API

Without code duplication.

---

# Multi-Tenant Readiness

MVP is single business.

Architecture should not prevent future:

```
Business

↓

Professionals

↓

Patients

↓

Appointments
```

Business ID should be easy to introduce later.

---

# Time Handling

Always store timestamps in UTC.

Render using business timezone.

Never depend on browser timezone for business rules.

---

# Calendar

Calendar should be provider-independent.

Future integrations

Google Calendar

Microsoft Calendar

Apple Calendar

Internal scheduling engine remains source of truth.

---

# Holidays

Holiday provider should be abstracted.

Possible providers

Nager.Date

Calendarific

Google Calendar

Administrator can always override.

---

# CMS

CMS stores structured content.

Never HTML blobs.

Example

```
Hero

title

subtitle

buttons

image
```

Instead of

```
hero.html
```

---

# Statistics

Statistics module never computes directly from UI.

Aggregation happens server-side.

Future

Materialized views

Background jobs

---

# Reports

Reports should use application services.

Never query database from UI.

Future exports

Excel

CSV

PDF

Accounting integrations

---

# Testing Strategy

Every feature should include:

Unit tests

Integration tests

Future

E2E

Testing pyramid

```
Many Unit Tests

↓

Some Integration Tests

↓

Few E2E Tests
```

---

# Dependency Rules

Allowed

```
UI

↓

Application

↓

Domain

↓

Infrastructure
```

Forbidden

Infrastructure → UI

UI → Database

Database → Components

Components → SQL

---

# Naming Conventions

Components

```
AppointmentCard.tsx
```

Actions

```
create-appointment.ts
```

Schemas

```
appointment.schema.ts
```

Repositories

```
appointment.repository.ts
```

Services

```
booking.service.ts
```

Types

```
appointment.types.ts
```

Tests

```
booking.service.test.ts
```

---

# Code Style

Prefer

Small functions

Pure functions

Composition

Explicit names

Readable code

Avoid

God objects

Huge components

Massive hooks

Deep inheritance

Hidden side effects

---

# Performance Guidelines

Prefer

Server Components

Streaming

Pagination

Lazy loading

Optimistic updates only when beneficial

Avoid

Unnecessary client state

Global state abuse

Large client bundles

Waterfall requests

---

# Future Scalability

The architecture should allow adding:

- Payments
- Coupons
- Loyalty programs
- Insurance settlements
- Waiting lists
- Queue management
- Telemedicine
- Multiple clinics
- Public API
- Mobile apps
- AI assistants
- Integrations
- Accounting exports

without requiring major architectural rewrites.

---

# Decision Checklist

Before implementing any feature, ask:

- Does it belong to an existing feature?
- Is business logic inside the domain?
- Can this be a Server Component?
- Should this be a Server Action instead of an API Route?
- Is the module reusable?
- Is the implementation testable?
- Does it respect feature boundaries?
- Does it leak database details?
- Is it prepared for future expansion?

If any answer is **No**, reconsider the implementation before merging.

---

# Architecture Philosophy

The architecture favors **clarity over cleverness**.

Every module should be understandable in isolation.

Every business rule should have a single source of truth.

Every feature should evolve independently whenever possible.

The project should remain enjoyable to maintain after years of continuous development.

When in doubt:

1. Keep business logic in the domain.
2. Prefer composition over abstraction.
3. Prefer explicitness over magic.
4. Optimize for maintainability first.
5. Build today without blocking tomorrow.
