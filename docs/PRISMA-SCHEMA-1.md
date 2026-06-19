# PRISMA-SCHEMA.md

# Prisma Database Specification

> Este documento define el modelo completo de datos del Booking Engine.
>
> No contiene código Prisma definitivo. Su objetivo es especificar todas las entidades, relaciones y restricciones antes de implementar `schema.prisma`.

---

# Objetivos

El modelo debe ser:

- Escalable
- Normalizado
- Compatible con PostgreSQL
- Compatible con Prisma ORM
- Preparado para futuras funcionalidades
- Fácil de migrar

---

# Convenciones

Todas las tablas utilizan:

```text
UUID como Primary Key
```

Campos comunes:

```text
id

createdAt

updatedAt
```

Cuando aplique:

```text
deletedAt
```

---

# Convenciones de nombres

Tablas

Singular

```text
User

Professional

Booking
```

Campos

camelCase

Relaciones

Siempre explícitas.

---

# ENUMS

## UserRole

```text
ADMIN

PROFESSIONAL

PATIENT
```

---

## BookingStatus

```text
PENDING

CONFIRMED

CANCELLED

COMPLETED

NO_SHOW
```

---

## PaymentStatus

```text
PENDING

PAID

FAILED

REFUNDED

PARTIALLY_REFUNDED
```

---

## LandingSectionType

```text
HERO

ABOUT

SERVICES

GALLERY

REVIEWS

CONTACT

CUSTOM
```

---

## NotificationType

```text
EMAIL

SMS

WHATSAPP

PUSH
```

---

# USER

Representa cualquier usuario autenticado.

## Campos

```text
id

email

passwordHash

role

emailVerified

createdAt

updatedAt
```

## Relaciones

```text
Professional (1:1)

Patient (1:1)
```

## Restricciones

email

Unique

---

# PROFESSIONAL

Representa al profesional.

## Campos

```text
id

userId

slug

firstName

lastName

specialty

bio

phone

website

avatarUrl

avatarPublicId

coverImageUrl

coverPublicId

timezone

currency

isActive

createdAt

updatedAt
```

## Relaciones

```text
User

Services

Bookings

Schedule

TimeOff

Reviews

GalleryImages

LandingSections

Payments
```

## Restricciones

slug

Unique

userId

Unique

---

# PATIENT

Representa un paciente.

## Campos

```text
id

userId

firstName

lastName

phone

createdAt

updatedAt
```

## Relaciones

```text
User

Bookings

Reviews
```

---

# SERVICE

Servicios ofrecidos.

## Campos

```text
id

professionalId

name

description

duration

price

currency

color

imageUrl

imagePublicId

active

createdAt

updatedAt
```

## Relaciones

```text
Professional

Bookings
```

---

# BOOKING

Reserva realizada.

## Campos

```text
id

professionalId

patientId

serviceId

status

startAt

endAt

timezone

notes

cancelReason

createdAt

updatedAt
```

## Relaciones

```text
Professional

Patient

Service

Payment

Review
```

## Restricciones

No permitir reservas superpuestas para el mismo profesional.

---

# SCHEDULE

Disponibilidad semanal.

## Campos

```text
id

professionalId

weekday

startHour

endHour

createdAt

updatedAt
```

## Relaciones

```text
Professional
```

Puede haber varios bloques por día.

Ejemplo

```text
09:00-13:00

15:00-19:00
```

---

# TIME OFF

Vacaciones.

Bloqueos.

Días festivos.

## Campos

```text
id

professionalId

startDate

endDate

reason

createdAt

updatedAt
```

## Relaciones

```text
Professional
```

---

# REVIEW

Opiniones.

## Campos

```text
id

bookingId

professionalId

patientId

rating

comment

createdAt

updatedAt
```

## Relaciones

```text
Booking

Professional

Patient
```

Rating

```text
1-5
```

---

# GALLERY IMAGE

Imágenes públicas.

## Campos

```text
id

professionalId

imageUrl

cloudinaryPublicId

alt

position

createdAt

updatedAt
```

## Relaciones

```text
Professional
```

---

# LANDING SECTION

Contenido editable.

## Campos

```text
id

professionalId

type

title

subtitle

body

imageUrl

cloudinaryPublicId

position

visible

createdAt

updatedAt
```

## Relaciones

```text
Professional
```

---

# PAYMENT

Preparado para Mercado Pago.

## Campos

```text
id

bookingId

professionalId

amount

currency

provider

providerPaymentId

status

paidAt

createdAt

updatedAt
```

## Relaciones

```text
Booking

Professional
```

---

# Próximas secciones

En la **Parte 2** se definirán:

- Notification
- AuditLog
- Coupon
- Package
- Invoice
- Availability Exceptions
- Relaciones completas
- Índices
- Reglas de integridad
- Cascadas
- Estrategias de borrado
