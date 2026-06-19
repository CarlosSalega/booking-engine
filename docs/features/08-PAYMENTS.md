# 08-payments.md

> Feature: Payments  
> Status: MVP  
> Provider: Mercado Pago Checkout Pro

---

# 1. Objetivo

Gestionar el flujo completo de pagos asociados a reservas, incluyendo integración con Mercado Pago Checkout Pro, estados de pago y sincronización mediante webhooks.

---

# 2. Alcance

Incluye:

- creación de pagos
- generación de preferencia en Mercado Pago
- redirección a Checkout Pro
- recepción de webhooks
- actualización de estados
- asociación con reservas

---

# 3. Entidad Payment

```ts
Payment {
  id: string
  organizationId: string

  bookingId: string

  provider: "MERCADOPAGO"

  status: PaymentStatus

  amount: number

  preferenceId?: string

  externalReference?: string

  createdAt: Date
  updatedAt: Date
}
```

---

# 4. Estados de pago

```
PENDING
APPROVED
REJECTED
CANCELLED
IN_PROCESS
```

---

# 5. Flujo de pago

```
Reserva requiere pago →
Se crea Payment →
Se genera preference en Mercado Pago →
Usuario paga en Checkout Pro →
Webhook notifica resultado →
Sistema actualiza estado →
Reserva se confirma o cancela
```

---

# 6. Tipos de pago soportados

- sin pago
- seña (deposit)
- pago completo

---

# 7. Webhooks

Los webhooks son la fuente de verdad del sistema.

## Reglas:

- deben ser idempotentes
- deben validar firma de Mercado Pago
- pueden llegar duplicados
- pueden llegar fuera de orden

---

# 8. Reglas de negocio

- una reserva puede tener un solo payment activo
- el payment controla la confirmación de la reserva
- pagos rechazados liberan el slot
- pagos aprobados confirman la reserva

---

# 9. Integración con reservas

- booking puede estar en estado AWAITING_PAYMENT
- payment aprobado → booking CONFIRMED
- payment rechazado → booking CANCELLED

---

# 10. Errores comunes

- preference expirada
- webhook duplicado
- pago aprobado sin booking válido
- inconsistencia de estado

---

# 11. Seguridad

- validación de webhook signature
- no confiar en frontend
- validación server-side obligatoria

---

# 12. Consideraciones técnicas

- idempotency keys
- retries de webhook
- logging de eventos de pago
- separación domain vs provider (Mercado Pago encapsulado)
