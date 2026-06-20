# TESTING.md

# Testing Strategy

> Este documento define la estrategia oficial de pruebas del Booking Engine.

El objetivo es garantizar que las funcionalidades críticas sean confiables, mantenibles y fáciles de evolucionar sin introducir regresiones.

---

# Objetivos

Toda funcionalidad importante debe ser verificable mediante pruebas automatizadas.

La estrategia prioriza:

- Confiabilidad
- Rapidez
- Mantenibilidad
- Cobertura sobre reglas de negocio

---

# Pirámide de Testing

```
             E2E
        Integration
          Unit Tests
```

Prioridad:

1. Unit Tests
2. Integration Tests
3. End-to-End

---

# Tecnologías

## Unit Testing

- Vitest

---

## Component Testing

- React Testing Library

---

## Integration Testing

- Vitest
- Prisma Test Database

---

## E2E

- Playwright

---

# Qué debe probarse

## Dominio

Siempre.

Ejemplos:

- disponibilidad
- creación de reservas
- cancelaciones
- cálculo de horarios
- conflictos de agenda

Estas pruebas tienen máxima prioridad.

---

## Repositories

Validar:

- consultas
- filtros
- relaciones
- persistencia

---

## Server Actions

Probar:

- validación
- autorización
- respuestas
- errores

---

## API Routes

Probar:

- webhooks
- autenticación
- validación
- códigos HTTP

---

## Componentes

Solo probar comportamiento.

Nunca detalles internos de implementación.

Ejemplos:

- renderizado
- interacción
- accesibilidad
- estados

---

# Qué NO probar

No probar:

- Tailwind CSS
- implementación interna de React
- librerías externas
- Prisma
- Next.js

Solo nuestro código.

---

# Cobertura

Objetivo mínimo:

```text
80%
```

Objetivo ideal:

```text
90%
```

El porcentaje nunca sustituye pruebas de calidad.

---

# Organización

```
modules/

bookings/

tests/

booking.service.test.ts

booking.repository.test.ts

booking.validation.test.ts
```

Componentes

```
components/

booking-card.test.tsx
```

E2E

```
e2e/

booking.spec.ts

login.spec.ts

dashboard.spec.ts
```

---

# Unit Tests

Cada caso debe probar:

Caso correcto

↓

Errores

↓

Casos límite

Ejemplo:

```
Crear reserva

✔ disponible

✔ horario ocupado

✔ horario inválido

✔ duración incorrecta

✔ usuario sin permisos
```

---

# Integration Tests

Validar interacción entre:

- dominio
- repositorio
- base de datos

Sin depender de servicios externos.

---

# E2E

Escenarios críticos:

- Login
- Registro
- Crear reserva
- Cancelar reserva
- Editar perfil
- Crear servicio
- Editar horario
- Subir imagen
- Actualizar landing

---

# Base de Datos de Testing

Debe ser independiente.

Nunca utilizar producción.

Nunca utilizar desarrollo compartido.

---

# Mocking

Se pueden mockear:

- Cloudinary
- Mercado Pago
- Better Auth
- Email
- Analytics

No mockear la lógica de negocio.

---

# Datos de Prueba

Utilizar factories.

Ejemplo:

```
createProfessional()

createBooking()

createPatient()

createService()
```

Evitar objetos enormes repetidos.

---

# Fixtures

Crear fixtures reutilizables para:

- usuarios
- profesionales
- servicios
- horarios

---

# Convenciones

Cada test debe seguir:

```text
Arrange

Act

Assert
```

---

# Nombres

Correcto

```ts
it("creates a booking when the slot is available");
```

Incorrecto

```ts
it("booking");
```

---

# Tests Independientes

Cada prueba debe ejecutarse de forma aislada.

Nunca depender del orden de ejecución.

---

# Tiempo de Ejecución

Los tests unitarios deben ejecutarse en pocos segundos.

Los E2E pueden ser más lentos.

---

# CI/CD

Todo Pull Request debe ejecutar automáticamente:

- Lint
- Type Check
- Unit Tests
- Integration Tests

Los E2E pueden ejecutarse en una etapa posterior del pipeline.

---

# Accesibilidad

Los componentes deben validar:

- navegación con teclado
- labels
- roles ARIA
- foco visible

---

# Regresiones

Cada bug corregido debe incluir un test que evite su reaparición.

---

# Objetivo

Las pruebas deben validar comportamiento observable, no la implementación interna.

Esto permite refactorizar el código con seguridad.

---

# Principio Final

Si una funcionalidad crítica no tiene pruebas, debe considerarse incompleta.
