# 07-services.md

> Feature: Services  
> Status: MVP

---

# 1. Objetivo

Definir y gestionar los servicios que ofrece el negocio, incluyendo duración, precios, reglas de pago y relación con profesionales.

---

# 2. Alcance

Incluye:

- creación de servicios
- edición de servicios
- asignación de profesionales
- configuración de duración
- configuración de precios
- reglas de pago
- activación/desactivación

---

# 3. Entidad Service

```ts
Service {
  id: string
  organizationId: string

  name: string
  description?: string

  durationMinutes: number

  price?: number

  isActive: boolean

  requiresPayment: boolean

  paymentType?: "NONE" | "DEPOSIT" | "FULL"

  depositAmount?: number

  createdAt: Date
  updatedAt: Date
}
```

---

# 4. Configuración de servicios

Cada servicio puede definir:

- duración (default 30 min)
- precio base
- si requiere pago
- tipo de pago
- monto de seña
- profesionales habilitados

---

# 5. Tipos de pago

## NONE

No requiere pago para reservar.

---

## DEPOSIT

Se requiere una seña para confirmar la reserva.

---

## FULL

Se requiere pago completo anticipado.

---

# 6. Reglas de negocio

- un servicio define la duración del turno
- no puede haber reservas sin servicio válido
- servicios inactivos no pueden ser reservados
- el pago depende de la configuración del servicio
- un servicio puede ser compartido entre profesionales

---

# 7. Relación con profesionales

```
Service ↔ Professional (many-to-many)
```

---

# 8. Reglas de disponibilidad

- si un servicio no está asignado al profesional, no puede reservarse
- duración del servicio define el slot del calendario

---

# 9. Estados

- ACTIVE
- INACTIVE

---

# 10. Permisos

- ADMIN: gestión total
- SECRETARY: gestión operativa
- PROFESSIONAL: solo visualización (opcional edición futura)

---

# 11. Consideraciones técnicas

- indexación por organizationId
- optimización de queries por isActive
- validación server-side en booking creation
- caching de servicios activos
