# PRISMA-SCHEMA.md

# Prisma Database Specification

## Parte 3 — Reglas de Integridad, Convenciones Prisma y Escalabilidad

---

# Estrategia de Borrado

El proyecto utiliza dos estrategias:

## Hard Delete

Únicamente para datos temporales o sin valor histórico.

Ejemplos:

- AvailabilityException
- Notification (opcional)
- Seeds de desarrollo

---

## Soft Delete

Debe utilizarse para entidades de negocio.

Ejemplos:

- Professional
- Service
- Booking
- Patient
- Coupon
- Package

Campos:

```text
deletedAt
```

Nunca eliminar físicamente información importante.

---

# Reglas ON DELETE

## User → Professional

```text
RESTRICT
```

No eliminar un usuario con información asociada.

---

## User → Patient

```text
RESTRICT
```

---

## Professional → Service

```text
RESTRICT
```

Los servicios con reservas históricas no deben eliminarse.

---

## Professional → Booking

```text
RESTRICT
```

Nunca perder el historial de reservas.

---

## Booking → Review

```text
CASCADE
```

Si una reserva de prueba es eliminada (desarrollo), la reseña también.

En producción, las reservas normalmente utilizarán Soft Delete.

---

## Booking → Payment

```text
RESTRICT
```

Nunca eliminar pagos accidentalmente.

---

## Professional → GalleryImage

```text
CASCADE
```

Al eliminar un profesional (en desarrollo), también se elimina su galería.

En producción se recomienda Soft Delete.

---

## Professional → LandingSection

```text
CASCADE
```

---

# Convenciones Prisma

Todos los modelos siguen el formato:

```prisma
model Professional {

}
```

Los enums:

```prisma
enum BookingStatus {

}
```

Relaciones nombradas explícitamente cuando exista ambigüedad.

Ejemplo:

```prisma
@relation("ProfessionalBookings")
```

---

# Convención de Campos

## IDs

Siempre:

```text
id String @id @default(uuid())
```

---

## Fechas

Siempre:

```text
createdAt DateTime @default(now())

updatedAt DateTime @updatedAt
```

---

## Booleanos

Siempre comenzar por:

```text
is

has

can
```

Ejemplos:

```text
isActive

isPublic

hasPaid
```

---

## URLs

Separar siempre:

```text
imageUrl

cloudinaryPublicId
```

Nunca almacenar únicamente la URL.

---

# Timezone

Toda fecha se almacena en UTC.

Cada profesional posee:

```text
timezone
```

Ejemplo:

```text
Europe/Madrid

America/Mexico_City

America/Bogota
```

Las conversiones se realizan únicamente en la capa de aplicación.

---

# Monedas

Cada profesional define una moneda por defecto.

Ejemplo:

```text
EUR

USD

MXN

COP

ARS

CLP
```

Los importes se almacenan siempre junto a su moneda.

---

# Optimización

Evitar consultas N+1.

Utilizar:

- `include`
- `select`
- consultas específicas
- paginación

Nunca cargar relaciones innecesarias.

---

# Paginación

Todas las listas grandes deben soportar:

```text
take

skip

cursor
```

Preparadas para Cursor Pagination.

---

# Auditoría

Toda operación crítica podrá generar un registro en `AuditLog`.

Eventos sugeridos:

```text
USER_CREATED

PROFILE_UPDATED

BOOKING_CREATED

BOOKING_CANCELLED

BOOKING_COMPLETED

SERVICE_CREATED

SERVICE_UPDATED

LANDING_UPDATED

PAYMENT_COMPLETED

LOGIN

LOGOUT
```

---

# Escalabilidad

El esquema está preparado para incorporar sin romper compatibilidad:

## Multi-Sede

Nueva entidad:

```text
Location
```

Relaciones:

```text
Professional

↓

Location

↓

Schedule

↓

Booking
```

---

## Equipos

Nueva entidad:

```text
Team
```

---

## Asistentes

Nueva entidad:

```text
Assistant
```

---

## Recursos

Nueva entidad:

```text
Resource
```

Ejemplos:

- Sala
- Cabina
- Equipo
- Vehículo

---

## Marketplace

Nueva entidad:

```text
Category

City

Tag
```

---

## SaaS Multi-Tenant

Nueva entidad:

```text
Workspace
```

Relaciones futuras:

```text
Workspace

↓

Professionals

↓

Patients

↓

Bookings
```

El resto del modelo no necesitaría cambios importantes.

---

# Diagrama Conceptual

```text
                 User
                /    \
               /      \
      Professional   Patient
            |
   -------------------------
   |     |      |         |
Service Schedule Gallery Landing
   |
 Booking
   |
-----------------------
|         |           |
Payment  Review  Notification
```

---

# Principios del Modelo

- Un modelo representa un único concepto de negocio.
- Las relaciones deben ser explícitas.
- Las reglas críticas no dependen del frontend.
- El historial nunca debe perderse.
- Toda entidad debe ser fácilmente extensible.

---

# Relación con la Arquitectura

Este documento es la especificación funcional del modelo de datos.

A partir de él se implementarán:

1. `prisma/schema.prisma`
2. Migraciones con Prisma Migrate
3. Repositories
4. Casos de uso del dominio
5. Server Actions

Cualquier modificación estructural de la base de datos debe reflejarse primero en este documento y posteriormente en el esquema Prisma.

---

# Principio Final

El modelo de datos es la base del sistema.

Debe mantenerse estable, coherente y preparado para el crecimiento del producto, priorizando la integridad de la información y la compatibilidad con futuras funcionalidades.
