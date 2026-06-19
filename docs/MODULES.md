# MODULES.md

# Feature-Based Modules

Versión: 1.0

---

# Objetivo

La aplicación utilizará una arquitectura **Feature-Based Modules**, donde cada módulo representa un dominio funcional del negocio y contiene todo lo necesario para operar de forma independiente.

Esta organización reduce el acoplamiento, mejora la escalabilidad y facilita el mantenimiento del proyecto conforme crece.

Cada módulo encapsula:

- UI
- Componentes
- Casos de uso
- Acciones del servidor
- Validaciones
- Repositorios
- Tipos
- Hooks
- Servicios
- Constantes
- Tests

---

# Principios

## Alta cohesión

Todo el código relacionado con una funcionalidad vive dentro del mismo módulo.

Ejemplo:

```
Booking

↓

UI

↓

Validation

↓

Repository

↓

Use Cases

↓

Actions
```

No debe existir lógica de reservas distribuida por todo el proyecto.

---

## Bajo acoplamiento

Los módulos solo pueden comunicarse mediante interfaces públicas.

Nunca acceder directamente a archivos internos de otro módulo.

Correcto

```
booking/index.ts
```

Incorrecto

```
booking/application/create-booking.ts
```

---

## Independencia

Cada módulo debe poder evolucionar sin afectar al resto del sistema.

---

# Estructura General

```
src/

modules/

shared/

core/

lib/

app/
```

---

# Estructura de un módulo

```
booking/

application/

domain/

infrastructure/

presentation/

actions/

hooks/

schemas/

types/

constants/

utils/

index.ts
```

---

# application

Contiene los casos de uso.

Ejemplos

```
create-booking.ts

cancel-booking.ts

confirm-booking.ts

complete-booking.ts

reschedule-booking.ts

find-bookings.ts

get-booking.ts
```

Aquí vive toda la lógica de aplicación.

No contiene componentes React.

---

# domain

Representa las reglas del negocio.

Contiene

```
entities/

value-objects/

interfaces/

repositories/

services/

errors/

events/
```

Ejemplos

```
Booking

BookingStatus

AvailabilityPolicy

BookingRepository
```

Nunca depende de Prisma.

Nunca depende de React.

Nunca depende de Next.js.

---

# infrastructure

Implementaciones concretas.

Ejemplos

```
prisma-booking.repository.ts

cloudinary.service.ts

stripe.service.ts

email.service.ts
```

Todo acceso externo pertenece aquí.

---

# presentation

Todo lo relacionado con UI.

```
components/

pages/

dialogs/

forms/

tables/

cards/

charts/
```

Ejemplos

```
BookingCard

BookingCalendar

BookingForm

BookingStatusBadge

BookingTable
```

---

# actions

Server Actions.

Ejemplo

```
create-booking.action.ts

cancel-booking.action.ts

update-booking.action.ts
```

Las Actions únicamente:

- validan
- llaman al caso de uso
- devuelven respuesta

Nunca contienen reglas de negocio.

---

# schemas

Validaciones Zod.

Ejemplo

```
create-booking.schema.ts

update-booking.schema.ts

availability.schema.ts
```

---

# hooks

Hooks exclusivos del módulo.

Ejemplo

```
use-bookings.ts

use-calendar.ts

use-booking-filter.ts
```

---

# types

Tipos propios del módulo.

```
booking.dto.ts

booking.response.ts

booking.filters.ts
```

---

# constants

Constantes.

```
booking-status.ts

booking-colors.ts

booking-permissions.ts
```

---

# utils

Funciones auxiliares específicas.

Ejemplo

```
booking-duration.ts

booking-price.ts

booking-color.ts
```

---

# Barrel Export

Cada módulo exporta únicamente su API pública.

```
index.ts
```

Ejemplo

```
export * from "./actions";

export * from "./presentation";

export * from "./application";
```

Nunca importar archivos internos directamente.

---

# Módulos del Sistema

## auth

Responsabilidades

- autenticación
- autorización
- roles
- permisos
- sesión

---

## users

Gestiona usuarios.

- perfil
- configuración
- preferencias

---

## professionals

Gestiona profesionales.

- perfil
- especialidades
- biografía
- experiencia
- avatar
- galería

---

## services

Servicios ofrecidos.

- duración
- precio
- categoría
- disponibilidad
- color

---

## bookings

Núcleo del sistema.

Responsable de:

- reservas
- cambios
- cancelaciones
- confirmaciones
- historial

---

## schedules

Horarios laborales.

- días
- bloques
- descansos
- excepciones
- vacaciones

---

## availability

Calcula disponibilidad.

Nunca almacena datos.

Solo calcula.

---

## patients

Pacientes o clientes.

- historial
- reservas
- información básica
- notas

---

## dashboard

Toda la analítica.

Incluye:

- KPIs
- estadísticas
- gráficos
- métricas
- actividad reciente

---

## landing

Editor de la landing pública.

- Hero
- About
- Servicios
- Galería
- Testimonios
- FAQ
- Contacto
- SEO

---

## gallery

Gestión multimedia.

Integración con Cloudinary.

- imágenes
- optimización
- eliminación
- orden

---

## reviews

Valoraciones.

- puntuaciones
- comentarios
- moderación

---

## notifications

Notificaciones.

- email
- dashboard
- futuras push notifications

---

## payments

Pasarela de pagos.

Preparado para:

- Stripe
- Mercado Pago
- PayPal

---

## coupons

Gestión de descuentos.

---

## packages

Venta de paquetes.

---

## analytics

Eventos y métricas.

Google Analytics

Meta Pixel

PostHog

---

## settings

Configuración del negocio.

- moneda
- idioma
- timezone
- branding
- horarios generales

---

# Shared

Todo aquello reutilizable.

```
shared/

components/

hooks/

schemas/

types/

constants/

utils/
```

Ejemplos

```
Button

Modal

Table

Input

Badge

Avatar

Pagination
```

No contiene lógica de negocio.

---

# Core

Código transversal.

```
core/

auth/

database/

logger/

cache/

permissions/

config/
```

Responsabilidades

- Clerk
- Prisma
- RBAC
- configuración
- logging

---

# Dependencias Permitidas

```
Presentation

↓

Application

↓

Domain

↓

Infrastructure
```

Nunca al revés.

---

# Dependencias Prohibidas

Domain

❌ React

❌ Prisma

❌ Next.js

❌ Cloudinary

❌ Clerk

❌ Stripe

---

# Comunicación entre módulos

Permitido

```
Booking

↓

Availability
```

```
Booking

↓

Patients
```

```
Dashboard

↓

Bookings
```

No permitido

```
Booking

↓

Modificar directamente Services
```

Siempre mediante casos de uso públicos.

---

# Testing

Cada módulo puede contener:

```
__tests__/

unit/

integration/
```

Los tests pertenecen al módulo correspondiente.

---

# Objetivo Final

Cada módulo debe comportarse como un pequeño sistema autónomo, con responsabilidades claras, dependencias controladas y una API pública bien definida.

Esta organización permitirá escalar el proyecto desde una aplicación para un único profesional hasta una plataforma SaaS multi-tenant sin necesidad de reorganizar la estructura del código.
