# ROUTING.md

# Routing Specification

## Booking Engine

Versión: 1.0

---

# Objetivo

La aplicación utilizará **Next.js App Router** como sistema de enrutamiento principal.

La estructura de rutas estará organizada por áreas funcionales y protegida mediante autenticación y autorización basada en roles.

Se separarán claramente:

- Landing pública
- Autenticación
- Dashboard
- Panel de administración
- Panel del profesional
- Panel de secretaria
- Portal del paciente
- API
- Assets

---

# Principios

## App Router

Toda la aplicación utilizará:

```
src/app
```

No se utilizará `pages/`.

---

## Route Groups

Se emplearán Route Groups para separar áreas de la aplicación sin afectar la URL.

Ejemplo:

```
(public)

(auth)

(dashboard)

(admin)

(professional)

(patient)
```

---

# Estructura General

```
src/

app/

├── (public)
├── (auth)
├── (dashboard)
├── api
├── globals.css
├── layout.tsx
├── not-found.tsx
├── error.tsx
└── loading.tsx
```

---

# Landing Pública

```
(public)/

page.tsx

about/

services/

gallery/

reviews/

contact/

privacy-policy/

terms/

faq/
```

Rutas públicas:

```
/

about

services

gallery

reviews

faq

contact
```

No requieren autenticación.

---

# Reserva Pública

La reserva debe poder realizarse sin acceder al dashboard.

```
book/

page.tsx
```

Flujo:

```
Seleccionar profesional

↓

Seleccionar servicio

↓

Elegir fecha

↓

Elegir horario

↓

Datos del paciente

↓

Confirmación
```

---

# Autenticación

```
(auth)

sign-in

sign-up

forgot-password

verify-email
```

Todas gestionadas por Clerk.

---

# Dashboard

Una vez autenticado, el usuario accede a:

```
/dashboard
```

Desde aquí se redirige automáticamente según su rol.

---

# Dashboard Principal

```
dashboard/

page.tsx
```

Debe mostrar:

- KPIs
- gráficos
- reservas del día
- actividad reciente
- próximos pacientes
- ingresos
- accesos rápidos

---

# Dashboard del Profesional

```
dashboard/

calendar/

bookings/

patients/

services/

schedule/

gallery/

landing/

reviews/

analytics/

settings/
```

---

# Dashboard de Secretaria

```
dashboard/

calendar/

bookings/

patients/

schedule/
```

No podrá acceder a:

- configuración
- pagos
- usuarios
- roles

---

# Dashboard Administrador

Acceso completo.

```
dashboard/

users/

roles/

permissions/

settings/

audit/

analytics/
```

---

# Portal del Paciente

```
portal/

page.tsx

appointments/

profile/

reviews/
```

Desde aquí podrá:

- consultar reservas
- cancelar citas
- reprogramar (si está permitido)
- actualizar perfil

---

# Rutas Dinámicas

Profesionales

```
/professionals/[slug]
```

Servicios

```
/services/[slug]
```

Reserva

```
/book/[professionalSlug]
```

Paciente

```
/patients/[id]
```

Reserva

```
/bookings/[id]
```

---

# API

```
api/

v1/

bookings/

payments/

webhooks/

availability/
```

Preparada para futuras integraciones externas.

---

# Route Handlers

Solo se utilizarán cuando sea necesario.

Ejemplos:

```
Stripe Webhooks

MercadoPago Webhooks

Cloudinary Callbacks

Health Check
```

La lógica del negocio nunca vivirá aquí.

---

# Layouts

## Root Layout

```
layout.tsx
```

Incluye:

- Providers
- Theme
- ClerkProvider
- Toasts
- Fonts
- Metadata

---

## Public Layout

```
(public)/layout.tsx
```

Componentes:

- Navbar
- Footer
- Cookie Banner

---

## Auth Layout

```
(auth)/layout.tsx
```

Minimalista.

Sin navegación principal.

---

## Dashboard Layout

```
(dashboard)/layout.tsx
```

Incluye:

- Sidebar
- Header
- Breadcrumbs
- User Menu
- Notifications
- Command Palette

---

# Middleware

El middleware será responsable de:

- verificar autenticación
- verificar roles
- proteger rutas privadas
- redirigir usuarios según permisos

Ejemplo:

```
Invitado

↓

/dashboard

↓

Redirect

↓

/sign-in
```

---

# Protección por Roles

## Administrador

Acceso completo.

---

## Profesional

Acceso únicamente a:

```
dashboard

calendar

patients

services

schedule

gallery

landing

analytics

reviews
```

---

## Secretaria

Acceso a:

```
calendar

bookings

patients

schedule
```

Sin acceso a configuración ni administración.

---

## Paciente

Acceso únicamente a:

```
portal
```

---

# Metadata

Cada página debe definir:

```
title

description

openGraph

twitter

robots
```

Utilizando la API de Metadata de Next.js.

---

# Loading UI

Cada sección crítica contará con:

```
loading.tsx
```

Ejemplos:

- Dashboard
- Calendar
- Landing Editor
- Analytics
- Bookings

---

# Error Handling

Cada Route Group tendrá su propio:

```
error.tsx
```

Con recuperación mediante:

```
reset()
```

---

# Not Found

```
not-found.tsx
```

Página personalizada con:

- búsqueda
- botón de inicio
- acceso a reservas

---

# Parallel Routes (Preparado)

Se deja preparada la arquitectura para utilizar Parallel Routes en futuras versiones.

Casos de uso:

- panel lateral
- editor de landing
- vista rápida de reservas
- modal de paciente

---

# Intercepting Routes (Preparado)

Preparado para abrir como modal:

```
Booking

Patient

Service
```

Sin abandonar la página actual.

---

# SEO

La Landing será completamente indexable.

Se implementarán:

- Sitemap
- Robots.txt
- Canonical URLs
- Open Graph
- Structured Data (JSON-LD)
- Breadcrumbs

---

# Convenciones

## URLs

Siempre:

```
kebab-case
```

Ejemplo:

```
booking-history
```

No utilizar:

```
BookingHistory
```

---

## IDs

Internamente:

```
UUID
```

Públicamente:

```
slug
```

Siempre que sea posible.

---

# Navegación

La navegación principal incluirá:

## Landing

- Inicio
- Servicios
- Galería
- Reseñas
- Contacto
- Reservar

## Dashboard

- Inicio
- Agenda
- Reservas
- Pacientes
- Servicios
- Landing
- Galería
- Analytics
- Configuración

La visibilidad de cada opción dependerá del rol del usuario.

---

# Principios Finales

- Todas las rutas privadas estarán protegidas.
- La autorización se realizará tanto en el middleware como en el servidor.
- La Landing permanecerá desacoplada del Dashboard.
- El sistema estará preparado para crecer sin reorganizar el árbol de rutas.
- La estructura seguirá las mejores prácticas de Next.js App Router, permitiendo incorporar nuevas áreas funcionales sin afectar las existentes.
