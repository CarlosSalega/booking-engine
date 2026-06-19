# 03-bookings.md

> Feature: Bookings  
> Status: MVP

---

# 1. Objetivo

Gestionar el ciclo completo de reservas del sistema, desde la creación hasta su finalización, incluyendo estados, validaciones y reglas de negocio.

---

# 2. Alcance

Incluye:

- creación de reservas
- validación de disponibilidad
- cancelación
- reprogramación
- gestión de estados
- asociación con pagos
- historial de reservas

---

# 3. Entidad Booking

```ts
Booking {
  id: string
  organizationId: string
  patientId: string
  professionalId: string
  serviceId: string

  startTime: Date
  endTime: Date

  status: BookingStatus

  paymentStatus: PaymentStatus

  notes?: string

  createdAt: Date
  updatedAt: Date
}
```

---

# 4. Estados de Booking

```
PENDING
CONFIRMED
CANCELLED
RESCHEDULED
COMPLETED
NO_SHOW
AWAITING_PAYMENT
```

---

# 5. Flujo de creación

```
Selección servicio →
Selección profesional →
Selección horario →
Validación disponibilidad →
Ingreso datos cliente →
Pago (opcional) →
Confirmación de reserva
```

---

# 6. Validación de disponibilidad

Antes de crear una reserva:

- verificar horario del profesional
- verificar excepciones
- verificar reservas existentes
- verificar bloqueos manuales

---

# 7. Reglas de negocio

- no se permiten solapamientos
- duración depende del servicio
- reservas deben pertenecer a un profesional
- cliente puede ser anónimo (guest checkout)
- reservas pueden requerir pago según servicio

---

# 8. Cancelaciones

## Reglas:

- pueden estar permitidas o restringidas por configuración
- pueden generar penalización (futuro)
- liberan el slot automáticamente

---

# 9. Reprogramación

- mantiene historial de cambios
- genera nuevo slot
- invalida anterior reserva

---

# 10. Relación con pagos

- una reserva puede tener un pago asociado
- estados de pago afectan estado de reserva
- webhook sincroniza estado final

---

# 11. Casos de error

- slot ocupado
- servicio inactivo
- profesional no disponible
- pago fallido
- reserva expirada

---

# 12. Permisos

- ADMIN: todas las reservas
- SECRETARY: gestión operativa
- PROFESSIONAL: solo propias
- PATIENT: solo propias

---

# 13. Consideraciones técnicas

- locking optimista para evitar doble booking
- validación server-side obligatoria
- índices en startTime / professionalId
- consultas por rango de fechas
