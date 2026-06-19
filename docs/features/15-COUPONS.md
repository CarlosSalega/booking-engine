# 15-coupons.md

> Feature: Coupons  
> Status: Future Ready (MVP Prepared)

---

# 1. Objetivo

Permitir al negocio aplicar descuentos promocionales o de fidelización sobre servicios o reservas, manteniendo flexibilidad para reglas futuras.

---

# 2. Alcance

Incluye:

- creación de cupones
- validación de cupones
- aplicación en checkout
- control de vigencia
- límites de uso

---

# 3. Entidad Coupon

```ts
Coupon {
  id: string
  organizationId: string

  code: string

  type: "PERCENTAGE" | "FIXED"

  value: number

  isActive: boolean

  maxUses?: number
  usedCount: number

  validFrom?: Date
  validUntil?: Date

  createdAt: Date
  updatedAt: Date
}
```

---

# 4. Tipos de descuento

## 4.1 Percentage

Descuento en porcentaje sobre el total.

Ej: 10% OFF

---

## 4.2 Fixed

Descuento fijo en monto.

Ej: $500 OFF

---

# 5. Reglas de negocio

- el cupón debe ser válido y activo
- no puede estar expirado
- no puede superar el máximo de usos
- debe aplicarse antes del pago
- puede ser global o limitado por servicio (futuro)

---

# 6. Flujo de aplicación

```
Usuario ingresa código →
Sistema valida cupón →
Se recalcula total →
Se aplica descuento →
Se genera payment actualizado
```

---

# 7. Validaciones

- código único por organización
- verificación de vigencia
- verificación de uso máximo
- verificación de estado activo

---

# 8. Integración con Payments

- cupones afectan monto final del payment
- el backend es la única fuente de cálculo
- frontend solo muestra estimación

---

# 9. Casos de error

- cupón inválido
- cupón expirado
- cupón agotado
- cupón no aplicable

---

# 10. Permisos

- ADMIN: gestión total
- SECRETARY: uso en reservas
- PROFESSIONAL: sin acceso
- PATIENT: solo aplicación

---

# 11. Consideraciones técnicas

- validación server-side obligatoria
- no confiar en frontend
- logs de uso de cupones
- preparación para reglas avanzadas futuras
