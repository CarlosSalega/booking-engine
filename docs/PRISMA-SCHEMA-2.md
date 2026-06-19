# PRISMA-SCHEMA.md

# Prisma Database Specification

## Parte 2 — Entidades Avanzadas, Relaciones e Índices

---

# NOTIFICATION

Registro de notificaciones enviadas al usuario.

No almacena plantillas, únicamente el histórico.

## Campos

```text
id

professionalId

patientId

bookingId

type

recipient

subject

message

sentAt

status

provider

providerMessageId

createdAt
```

## Relaciones

```text
Professional

Patient

Booking
```

Uso futuro para:

- Email
- SMS
- WhatsApp
- Push

---

# AUDIT LOG

Registro de todas las acciones críticas.

Nunca eliminar registros.

## Campos

```text
id

userId

action

entity

entityId

oldValues

newValues

ip

userAgent

createdAt
```

## Relaciones

```text
User
```

Ejemplos

```text
BOOKING_CREATED

BOOKING_CANCELLED

SERVICE_UPDATED

PROFILE_UPDATED

LOGIN

LOGOUT
```

---

# COUPON

Descuentos promocionales.

## Campos

```text
id

code

description

discountType

discountValue

maxUses

usedCount

validFrom

validUntil

active

createdAt

updatedAt
```

## Relaciones

Preparado para:

```text
Booking
```

---

# PACKAGE

Bonos o paquetes.

Ejemplo:

```
10 sesiones

5 masajes

12 consultas
```

## Campos

```text
id

professionalId

name

description

price

sessions

active

createdAt

updatedAt
```

---

# PACKAGE PURCHASE

Compra del paquete.

## Campos

```text
id

packageId

patientId

remainingSessions

expiresAt

createdAt
```

---

# INVOICE

Preparado para futura facturación.

## Campos

```text
id

bookingId

number

subtotal

tax

total

currency

pdfUrl

createdAt
```

---

# AVAILABILITY EXCEPTION

Excepciones al horario semanal.

Ejemplo

```text
Solo este jueves trabajaré:

08:00-12:00
```

## Campos

```text
id

professionalId

date

startHour

endHour

reason

createdAt
```

---

# RELACIONES COMPLETAS

User

↓

Professional

↓

Services

↓

Bookings

↓

Payments

↓

Reviews

---

Patient

↓

Bookings

↓

Reviews

---

Professional

↓

Schedule

↓

TimeOff

↓

AvailabilityException

↓

Gallery

↓

Landing

---

# CARDINALIDADES

User

↓

Professional

```text
1 : 1
```

---

User

↓

Patient

```text
1 : 1
```

---

Professional

↓

Service

```text
1 : N
```

---

Professional

↓

Booking

```text
1 : N
```

---

Patient

↓

Booking

```text
1 : N
```

---

Service

↓

Booking

```text
1 : N
```

---

Booking

↓

Payment

```text
1 : 1
```

---

Booking

↓

Review

```text
1 : 1
```

---

Professional

↓

Gallery

```text
1 : N
```

---

Professional

↓

LandingSection

```text
1 : N
```

---

Professional

↓

Schedule

```text
1 : N
```

---

Professional

↓

TimeOff

```text
1 : N
```

---

Professional

↓

AvailabilityException

```text
1 : N
```

---

# ÍNDICES

## User

```text
email UNIQUE
```

---

## Professional

```text
slug UNIQUE

userId UNIQUE

specialty
```

---

## Booking

```text
professionalId

patientId

serviceId

status

startAt

endAt
```

Índice compuesto recomendado:

```text
professionalId + startAt
```

---

## Review

```text
professionalId

rating
```

---

## GalleryImage

```text
professionalId

position
```

---

## LandingSection

```text
professionalId

position

type
```

---

## Payment

```text
bookingId UNIQUE

providerPaymentId
```

---

## Notification

```text
professionalId

patientId

sentAt
```

---

## Coupon

```text
code UNIQUE
```

---

# UNIQUE CONSTRAINTS

Professional.slug

Professional.userId

Booking.payment

Review.booking

Coupon.code

Payment.bookingId

User.email

---

# CHECK CONSTRAINTS

Rating

```text
1 <= rating <= 5
```

---

Price

```text
>= 0
```

---

Duration

```text
> 0
```

---

Remaining Sessions

```text
>= 0
```

---

Discount

Nunca negativo.

---

# Próxima Parte

En la **Parte 3** se definirán:

- Reglas de cascada
- Soft Delete
- Estrategias de migración
- Convenciones Prisma
- Nombres de relaciones
- Optimización
- Escalabilidad
- Preparación para Multi-tenant
- Ejemplo del diagrama entidad-relación
