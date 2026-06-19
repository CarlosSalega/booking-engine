# DOMAIN.md

# Domain Model

> This document defines the business domain of **Booking Engine**.
>
> It describes the core entities, their relationships, business rules, invariants and terminology.
>
> This document is independent of the implementation, framework, UI or database.
>
> **If the implementation contradicts this document, the implementation is wrong.**

---

# Domain Philosophy

Booking Engine is not a website.

It is a scheduling platform centered around one core business process:

```text
A patient books a service with a professional
at an available date and time.
```

Everything else exists to support that process.

---

# Ubiquitous Language

Every contributor should use the same terminology.

| Term         | Meaning                                     |
| ------------ | ------------------------------------------- |
| Business     | Organization using the platform             |
| Professional | Person providing services                   |
| Patient      | Customer receiving services                 |
| Appointment  | Reserved time slot                          |
| Service      | Work performed by a professional            |
| Schedule     | Weekly availability                         |
| Time Slot    | Available appointment interval              |
| Insurance    | Healthcare coverage (prepaga / obra social) |
| Landing      | Public marketing website                    |
| Dashboard    | Administrative interface                    |
| CMS          | Landing content management                  |
| Role         | Authorization level                         |

Never invent synonyms.

Use the same names everywhere.

---

# Domain Overview

```text
Business
│
├── Professionals
│      ├── Services
│      └── Schedules
│
├── Patients
│
├── Appointments
│
├── Landing CMS
│
├── Reports
│
└── Settings
```

Business is the root aggregate.

Although the MVP is single-business, every decision should preserve future multi-tenant compatibility.

---

# Core Aggregates

The system revolves around the following aggregates.

- Business
- Professional
- Patient
- Appointment
- Service

Everything else supports these entities.

---

# Business

Represents the organization using Booking Engine.

Examples

- Dermatology clinic
- Psychology center
- Law firm
- Nutrition office

---

## Responsibilities

Business owns:

- Branding
- Landing
- Professionals
- Patients
- Services
- Schedules
- Prices
- Reports
- Settings

---

## Business Rules

A business:

- can have many professionals
- can have many services
- can have many appointments
- owns all data

Future

Multiple businesses per installation.

---

# Professional

A professional performs services.

Examples

- Doctor
- Psychologist
- Lawyer
- Nutritionist

---

## Properties

Examples

- Name
- Photo
- Biography
- Active status

Future

- License number
- Specialty
- Multiple locations

---

## Responsibilities

Professional

- provides services
- owns schedules
- attends appointments

---

## Business Rules

A professional:

- may provide multiple services
- may be inactive
- may take vacations
- may define schedule exceptions
- may temporarily stop receiving appointments

---

# Service

Represents work offered by the business.

Examples

- Dermatology consultation
- Skin check
- Therapy session
- Legal consultation

---

## Properties

- Name
- Description
- Duration
- Optional price
- Active status

Future

- Category
- Color
- Preparation instructions

---

## Business Rules

A service

- belongs to the business
- may be offered by multiple professionals
- may be disabled
- duration is required
- price is optional

---

# Professional-Service Relationship

Relationship

Many-to-Many

Reason

Example

Skin examination

Professional A

Professional B

Professional C

All can perform the same service.

---

# Patient

Represents the customer.

The name "Patient" is intentionally used because the first target market is healthcare.

Future versions may introduce a generic alias ("Client"), but internally Patient remains the canonical domain term.

---

## Patient Lifecycle

Lead

↓

Registered

↓

Booked

↓

Returning

↓

Inactive

---

## Properties

Recommended MVP

- First name
- Last name
- Email
- Phone
- Birth date (optional)
- Notes
- Active status

Future

- Address
- Emergency contact
- Documents
- Medical history
- Attachments

---

## Business Rules

Patient

- may have many appointments
- may cancel appointments
- may return many times
- may belong to an insurance provider

---

# Coverage

A patient may book as:

- Private
- Insurance
- Healthcare provider

Coverage affects billing, not scheduling.

Scheduling rules remain identical.

---

## Insurance

Examples

Prepaga

Obra Social

---

Properties

- Name
- Commission
- Active

Future

- Authorization requirements
- Billing code
- Coverage percentage

---

# Appointment

Appointment is the heart of the domain.

Everything ultimately exists to support appointments.

---

## Appointment consists of

Patient

-

Professional

-

Service

-

Date

-

Time

---

## Appointment States

Draft

↓

Pending

↓

Confirmed

↓

Completed

↓

Archived

---

Alternative flows

Pending

↓

Cancelled

Pending

↓

No Show

Confirmed

↓

Cancelled

---

## Status Definitions

Draft

Temporary.

Never visible publicly.

---

Pending

Reserved but not yet finalized.

Future

Online payments.

---

Confirmed

Official appointment.

Slot becomes unavailable.

---

Completed

Service performed.

Statistics include completed appointments.

---

Cancelled

Slot released.

Reason should be stored.

---

No Show

Patient never arrived.

Slot remains consumed.

---

Archived

Historical only.

Cannot be edited.

---

# Appointment Invariants

The following rules can never be broken.

An appointment:

must have one patient

must have one professional

must have one service

must have one start datetime

must have one duration

must belong to one business

---

# Scheduling

Schedules define availability.

Appointments consume availability.

Never the opposite.

---

## Weekly Schedule

Professional defines:

Monday

Tuesday

Wednesday

...

Each day may contain multiple intervals.

Example

09:00–12:00

15:00–19:00

---

## Exceptions

Specific dates override weekly schedules.

Example

Christmas

Vacation

Conference

Personal leave

---

## Holidays

Holiday detection is automatic.

Administrator can override.

Example

Business closed

↓

Admin enables appointments

↓

Holiday becomes available.

---

## Vacations

Vacations have higher priority than weekly schedules.

Vacation blocks appointments.

---

# Time Slot

Time Slot is generated dynamically.

It is **not** stored.

Generated from

Weekly schedule

−

Exceptions

−

Vacations

−

Existing appointments

=

Available slots

---

# Duration

Duration belongs to Service.

Example

Consultation

30 minutes

Therapy

60 minutes

Evaluation

90 minutes

---

Future

Custom duration override.

---

# Buffers

Future feature.

Buffers reduce available slots.

Example

30-minute consultation

-

10-minute cleaning

=

40 minutes consumed

Architecture must support this.

---

# Cancellation

Cancellation policy belongs to Business.

Configurable.

Examples

24 hours

12 hours

No restrictions

Professional approval

---

# Rescheduling

Future feature.

Rescheduling is not cancellation.

Appointment identity remains the same.

Only date/time changes.

---

# Landing

Landing represents the public website.

It is not part of scheduling.

Its objective:

Convert visitors into appointments.

---

Landing sections

Hero

Services

Professionals

Testimonials

FAQ

Contact

CTA

---

Landing content is editable through CMS.

---

# CMS

CMS stores structured content.

Never HTML.

Examples

Hero Title

Hero Subtitle

Hero Buttons

Testimonials

Contact

---

# Dashboard

Dashboard is the operational interface.

Not the public website.

---

Responsibilities

Appointments

Patients

Professionals

Services

Landing

Reports

Statistics

Settings

---

# Statistics

Statistics are derived.

Never entered manually.

Examples

Appointments today

Revenue

Most requested service

Cancellation rate

Returning patients

---

# Reports

Reports summarize domain information.

Examples

Appointments

Revenue

Insurance

Professionals

Patients

Future

Excel

CSV

PDF

---

# Discounts

Future module.

Discounts never modify historical prices.

Appointment stores final price.

Reasons

Audit

Reports

Accounting

---

Types

Coupon

Loyalty

Campaign

Manual

---

# Pricing

Price belongs to Service.

Appointment copies the price at booking time.

Future price changes must never modify historical appointments.

---

# Financial Data

Appointment stores:

Original price

Final price

Coverage

Discount

Professional payment

Commission

This enables historical accounting.

---

# Notifications

Notifications are side effects.

They never modify business state.

Examples

Appointment created

↓

Email sent

If email fails

Appointment remains created.

---

# Roles

Authorization is separate from the domain.

Roles control access.

They never modify business rules.

Roles

Administrator

Secretary

Professional

Patient

---

# Auditability

Every important change should be traceable.

Future

Created By

Updated By

Cancelled By

Timestamp

Reason

---

# Soft Delete

Business entities should prefer soft deletion.

Examples

Professional

Service

Insurance

Patient

Historical appointments must remain valid.

---

# Domain Events (Future)

Possible events

AppointmentCreated

AppointmentCancelled

AppointmentCompleted

PatientRegistered

ProfessionalDisabled

These events enable integrations without coupling modules.

---

# Future Modules

The domain should naturally support:

- Payments
- Telemedicine
- Waiting list
- Online check-in
- Digital forms
- Loyalty programs
- Gift cards
- AI assistant
- Calendar synchronization
- Accounting exports
- Inventory
- Prescriptions
- Medical records
- Multi-location
- Multi-business

None of these should require redesigning the core domain.

---

# Domain Principles

1. Business rules are independent of the UI.
2. Business rules are independent of the database.
3. Every appointment is immutable once completed.
4. Historical data must never change retroactively.
5. Availability is computed, never manually maintained.
6. Scheduling is deterministic.
7. Domain logic has a single source of truth.
8. Financial records must be auditable.
9. Configuration should be explicit and versionable.
10. The domain must remain generic enough to support any appointment-based profession.

---

# Final Guideline

When implementing a new feature, always ask:

- Does it introduce a new business concept?
- Can it be modeled as an existing aggregate?
- Does it violate any invariant?
- Does it belong to the scheduling domain or is it merely infrastructure?
- Will historical information remain consistent?
- Can this feature evolve without breaking existing rules?

If there is any doubt, update this document before writing code.

The **Domain Model** is the authoritative source of truth for the business behavior of Booking Engine.
