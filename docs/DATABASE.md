# DATABASE.md

# Database Design

> Este documento define la arquitectura de datos del Booking Engine.

La base de datos debe ser completamente normalizada, escalable y preparada para futuras funcionalidades como pagos, múltiples sedes, múltiples profesionales, suscripciones y marketplace.

---

# Base de Datos

Proveedor:

PostgreSQL

ORM:

Prisma

---

# Principios

- UUID como PK
- Soft Delete cuando aplique
- Auditoría
- Relaciones explícitas
- Índices en consultas frecuentes
- Restricciones mediante Foreign Keys
- Timestamps automáticos

---

# Convenciones

Todas las tablas incluyen:

```sql
id UUID PRIMARY KEY

created_at

updated_at
```

Cuando aplique:

```sql
deleted_at
```

---

# Relaciones

Siempre utilizar:

UUID

Nunca IDs autoincrementales.

---

# Entidades Principales

## User

Representa cualquier usuario autenticado.

Campos

- id
- email
- passwordHash
- role
- emailVerified
- createdAt
- updatedAt

Relaciones

- Professional
- Patient

---

## Professional

Información pública del profesional.

Campos

- id
- userId
- slug
- firstName
- lastName
- biography
- specialty
- avatarUrl
- coverImageUrl
- phone
- website
- isActive

Relaciones

- Services
- Schedule
- Bookings
- Reviews
- Gallery

---

## Patient

Información del paciente.

Campos

- id
- userId
- firstName
- lastName
- phone

Relaciones

- Bookings

---

## Service

Servicios ofrecidos.

Campos

- id
- professionalId
- name
- description
- duration
- price
- currency
- color
- active

---

## Booking

Reserva.

Campos

- id
- professionalId
- patientId
- serviceId
- startAt
- endAt
- timezone
- status
- notes

---

## Schedule

Disponibilidad semanal.

Campos

- id
- professionalId
- weekday
- startHour
- endHour

---

## TimeOff

Vacaciones o bloqueos.

Campos

- id
- professionalId
- startDate
- endDate
- reason

---

## Review

Valoraciones.

Campos

- id
- bookingId
- professionalId
- patientId
- rating
- comment

---

## GalleryImage

Imágenes públicas del profesional.

Campos

- id
- professionalId
- imageUrl
- cloudinaryPublicId
- alt
- order

---

## LandingSection

Contenido editable de la landing.

Campos

- id
- professionalId
- type
- title
- subtitle
- body
- imageUrl
- cloudinaryPublicId
- position
- visible

---

# Estados de Booking

```text
PENDING

CONFIRMED

CANCELLED

COMPLETED

NO_SHOW
```

---

# Roles

```text
ADMIN

PROFESSIONAL

PATIENT
```

---

# Índices

Bookings

- professionalId
- patientId
- startAt
- status

Professional

- slug
- specialty

Service

- professionalId

Review

- professionalId

GalleryImage

- professionalId
- order

LandingSection

- professionalId
- position

---

# Restricciones

No pueden existir dos bookings confirmados que se solapen para un mismo profesional.

Debe existir una constraint lógica que valide disponibilidad antes de confirmar una reserva.

---

# Eliminación

Nunca eliminar:

Bookings

Reviews

Payments

Solo Soft Delete.

---

# Cloudinary

Las imágenes nunca se almacenan en PostgreSQL.

Solo se guarda:

```text
imageUrl

cloudinaryPublicId
```

Cloudinary almacena:

- Avatar
- Cover
- Landing
- Galería
- Servicios
- Futuras imágenes del blog

---

# Auditoría

Registrar:

- creación
- actualización
- cancelaciones
- cambios de horario

Preparado para incorporar una tabla AuditLog.

---

# Escalabilidad

El modelo debe permitir añadir sin romper compatibilidad:

- múltiples sedes
- múltiples calendarios
- equipos
- asistentes
- membresías
- cupones
- pagos
- facturas
- notificaciones
- videollamadas
- marketplace

---

# Migraciones

Todas las modificaciones del esquema se realizan mediante Prisma Migrate.

Nunca modificar la base de datos manualmente en producción.

---

# Seeds

Debe existir un sistema de seeds para:

- Usuario administrador
- Profesional de ejemplo
- Servicios de ejemplo
- Horarios de ejemplo
- Landing de ejemplo

---

# Backups

La estrategia de backups dependerá del proveedor (Supabase, Neon, Railway o PostgreSQL administrado).

La aplicación debe ser completamente compatible con restauraciones automáticas.

---

# Principio Final

La base de datos representa la fuente única de verdad.

Toda regla de negocio crítica debe estar respaldada tanto por validaciones en la aplicación como por restricciones de integridad cuando sea posible.
