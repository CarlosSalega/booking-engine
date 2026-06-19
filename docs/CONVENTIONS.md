# CONVENTIONS.md

# Coding Conventions

> Este documento define las reglas obligatorias de desarrollo del proyecto.
>
> Ningún código debe escribirse fuera de estas convenciones.

---

# Filosofía

El proyecto prioriza:

- Simplicidad
- Legibilidad
- Reutilización
- Escalabilidad
- Bajo acoplamiento
- Alta cohesión
- Código explícito
- Domain Driven Design Lite
- Feature Based Modules
- Server First (Next.js App Router)

Siempre se prefiere código simple antes que código "ingenioso".

---

# Principios

## KISS

Mantener todo lo más simple posible.

Evitar abstracciones innecesarias.

---

## DRY

No repetir lógica.

Si una lógica se utiliza más de una vez debe evaluarse moverla a:

- helper
- util
- service
- hook
- componente

---

## SOLID

Aplicar SOLID cuando aporte valor.

Nunca sobreingeniería.

---

## Composition over Inheritance

Siempre utilizar composición.

---

## Single Responsibility

Cada archivo tiene una única responsabilidad.

Si un archivo supera aproximadamente:

- 300 líneas
- múltiples responsabilidades

Debe dividirse.

---

# TypeScript

Siempre:

```ts
strict: true;
```

No utilizar:

```ts
any;
```

Permitido únicamente cuando sea absolutamente imposible tipar.

Preferir:

```ts
unknown;
```

---

Usar:

```ts
type;
```

para DTOs.

Usar:

```ts
interface;
```

para contratos.

---

Ejemplo

```ts
type CreateProfessionalInput = {
  firstName: string;
  lastName: string;
};
```

---

# Naming

## Variables

camelCase

```ts
const professional;
```

---

## Funciones

camelCase

```ts
createAppointment();
```

---

## Componentes

PascalCase

```tsx
AppointmentCard;
```

---

## Hooks

Siempre

```ts
useSomething;
```

Ejemplo

```ts
useBooking;
```

---

## Constantes

UPPER_CASE

```ts
MAX_UPLOAD_SIZE;
```

---

## Enums

PascalCase

```ts
UserRole;
```

---

## Archivos

Siempre

kebab-case

Ejemplo

```
create-booking.ts

booking-card.tsx

calendar-grid.tsx
```

Nunca:

```
CreateBooking.ts

BookingCard.tsx
```

---

# Imports

Orden obligatorio

```ts
React

Next

Third Party

Shared

Modules

Relative
```

Ejemplo

```ts
import { redirect } from "next/navigation";

import { z } from "zod";

import { cn } from "@/lib/utils";

import { createBooking } from "@/modules/bookings/server/create-booking";

import "./styles.css";
```

---

# Barrel Exports

Cada carpeta pública debe tener

```text
index.ts
```

Nunca importar archivos internos directamente.

Correcto

```ts
import { BookingCard } from "@/modules/bookings";
```

Incorrecto

```ts
import { BookingCard } from "@/modules/bookings/components/booking-card";
```

---

# Componentes

Deben ser pequeños.

Ideal:

100 líneas.

Máximo recomendado:

200 líneas.

---

Separar:

UI

Lógica

Estado

---

# Props

Siempre tipadas.

```ts
type Props = {};
```

---

Nunca

```ts
function Component(props: any);
```

---

# Hooks

Un hook:

Una responsabilidad.

Correcto

```
useCalendar()

useBooking()

usePayments()
```

Incorrecto

```
useEverything()
```

---

# Server Actions

Se utilizan para:

- CRUD
- Mutaciones
- Formularios
- Dashboard

No utilizarlas para lectura pública cacheable.

---

Toda Server Action debe:

Validar

Autorizar

Ejecutar

Retornar resultado tipado

---

# API Routes

Solo para:

Webhooks

MercadoPago

Cloudinary

Health Checks

Integraciones

Exportaciones

Nunca para formularios internos.

---

# Validaciones

Toda entrada debe validarse con:

Zod

Siempre.

Jamás confiar en el frontend.

---

# Errores

Nunca:

```ts
throw "Error";
```

Siempre

```ts
throw new Error(...)
```

o errores propios.

---

Los mensajes internos nunca llegan al usuario.

---

# Logging

Nunca

```ts
console.log();
```

en producción.

Utilizar un logger.

---

# Async

Siempre

```ts
async / await;
```

Evitar

```ts
.then()
```

---

# Base de datos

Toda interacción pasa por:

Repository

o

Data Access Layer

Nunca desde componentes.

---

# Componentes UI

Los componentes UI nunca conocen la base de datos.

Nunca hacen queries.

Nunca contienen lógica de negocio.

---

# Domain Logic

Toda lógica de negocio vive dentro del módulo correspondiente.

Ejemplo

```
bookings/

payments/

calendar/

patients/
```

Nunca en

```
app/

components/
```

---

# Estados

Prioridad

Server Components

↓

URL State

↓

React State

↓

Context

Evitar Context innecesario.

---

# Formularios

React Hook Form

-

Zod

Siempre.

---

# Toasts

Sonner

Todos los mensajes deben ser consistentes.

Ejemplo

Success

Error

Warning

Info

---

# Fechas

Nunca usar Date directamente para lógica.

Centralizar helpers.

Todo debe soportar:

Timezone

DST

Locales

---

# Dinero

Nunca utilizar float.

Siempre almacenar:

integer

decimal

según corresponda.

---

# IDs

Siempre UUID.

Nunca IDs autoincrementales.

---

# Feature Flags

Las futuras funcionalidades deben poder activarse o desactivarse.

Ejemplos

Descuentos

Exportaciones

Analytics

Marketplace

---

# Comentarios

Evitar comentarios.

El código debe ser autoexplicativo.

Solo comentar:

Algoritmos complejos

Reglas de negocio

Integraciones externas

---

# CSS

Tailwind únicamente.

No escribir CSS salvo casos excepcionales.

---

# Componentes reutilizables

Si un componente puede reutilizarse:

Moverlo a

```
shared
```

Si pertenece al dominio:

Moverlo al módulo.

---

# Testing

Cada feature importante debe tener:

Unit Tests

Integration Tests

E2E cuando aplique.

---

# Performance

Evitar renders innecesarios.

Evitar useEffect si puede resolverse de otra forma.

Preferir Server Components.

---

# Accesibilidad

Todos los formularios deben incluir:

label

aria

keyboard navigation

focus visible

---

# Seguridad

Nunca confiar en el cliente.

Siempre validar:

Rol

Permisos

Ownership

Servidor.

---

# Convención de Carpetas

Cada módulo mantiene exactamente la misma estructura.

No agregar carpetas arbitrarias.

---

# Convención de Archivos

Un archivo.

Una responsabilidad.

---

# Regla de Oro

Si una IA tiene dudas sobre dónde ubicar código:

La respuesta correcta casi siempre es:

Moverlo al módulo correspondiente.

Nunca a `app/`.

El directorio `app/` únicamente orquesta la aplicación.
