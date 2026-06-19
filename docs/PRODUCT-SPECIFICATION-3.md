# 24. Edge Cases del Sistema

Esta sección define escenarios reales que deben ser contemplados para evitar fallos en producción.

---

# 24.1 Reservas

## Doble reserva simultánea

Dos usuarios intentan reservar el mismo horario.

### Solución:

- locking optimista en base de datos
- validación server-side final
- Webhook de confirmación de disponibilidad

---

## Reserva mientras se paga

Usuario inicia pago pero no completa.

### Estados:

```
AWAITING_PAYMENT → EXPIRED → SLOT LIBERADO
```

---

## Pago exitoso con slot ocupado

Caso crítico:

- usuario paga
- pero el slot ya fue tomado

### Solución:

- rollback lógico
- asignación de nuevo slot o reembolso automático (futuro)
- alertas internas

---

## Cancelación de último minuto

Se define política configurable:

- permitido
- con penalización
- no permitido

---

## No-show

Paciente no asiste.

Debe poder marcarse manualmente:

```
NO_SHOW
```

---

# 24.2 Pagos (Mercado Pago)

## Webhook duplicado

- sistema debe ser idempotente
- no duplicar reservas ni pagos

---

## Pago aprobado tardío

- reserva ya expirada

### Solución:

- marcar como “requiere revisión”
- notificación al admin

---

## Pago rechazado

- liberar slot automáticamente
- notificar al cliente

---

# 24.3 Calendario

## Solapamiento de excepciones

Ejemplo:

- feriado
- horario especial

### Regla:

- prioridad: excepción > horario regular > disponibilidad

---

# 25. Reglas de Negocio Globales

---

## 25.1 Fuente de verdad

- Base de datos es la única fuente de verdad
- Frontend nunca decide estado final

---

## 25.2 Reservas

- toda reserva debe tener:
  - servicio
  - profesional
  - horario exacto
  - estado
  - cliente

---

## 25.3 Pagos

- pagos no confirman reservas directamente
- webhook confirma estado final
- el sistema nunca confía en frontend

---

## 25.4 Disponibilidad

Disponibilidad =

```
horarios disponibles
- reservas confirmadas
- bloques manuales
- excepciones
```

---

# 26. Decisiones de Diseño Importantes

---

## 26.1 Single Tenant con estructura multi-tenant ready

- el sistema funciona como instancia única
- pero todas las entidades están preparadas con OrganizationId

---

## 26.2 Better Auth

- solo maneja identidad
- NO maneja permisos del negocio

---

## 26.3 Mercado Pago

- único proveedor MVP
- encapsulado en Payments module
- reemplazable en el futuro

---

## 26.4 Feature-Based Architecture

- cada módulo es independiente
- no hay dependencia directa entre módulos internos
- comunicación solo vía interfaces públicas

---

## 26.5 Server Actions

- lógica de negocio en application layer
- actions solo orquestan
- nunca contienen reglas

---

# 27. Criterios de Aceptación del MVP

El sistema se considera listo para producción cuando:

---

## 27.1 Reservas

- un usuario puede reservar sin errores
- no hay doble booking
- estados funcionan correctamente

---

## 27.2 Pagos

- Mercado Pago Checkout Pro funciona end-to-end
- webhook sincroniza estado correctamente
- reservas pagadas se confirman automáticamente

---

## 27.3 Dashboard

- muestra métricas reales
- datos consistentes con DB
- carga en menos de 2s

---

## 27.4 Calendario

- permite operar el negocio diario
- soporta drag & drop
- refleja disponibilidad real

---

## 27.5 Landing

- completamente editable
- muestra servicios reales
- permite reservas funcionales

---

## 27.6 Roles

- permisos funcionan correctamente
- no hay acceso indebido
- separación ADMIN / SECRETARY / PROFESSIONAL

---

# 28. Métricas de Éxito del Producto

---

## 28.1 Producto

- % de reservas completadas
- tasa de conversión landing → booking
- tasa de pagos exitosos
- tasa de cancelación

---

## 28.2 Negocio

- ingresos generados por sistema
- reducción de no-shows
- aumento de ocupación

---

## 28.3 UX

- tiempo promedio de reserva < 60s
- tasa de abandono en booking flow

---

# 29. Riesgos del Sistema

---

## 29.1 Complejidad de pagos

Mercado Pago puede generar:

- estados inconsistentes
- delays en webhook

Mitigación:

- idempotencia
- retry system
- auditoría

---

## 29.2 Overengineering inicial

Riesgo:

- implementar multi-tenant demasiado pronto

Mitigación:

- mantener single tenant real
- solo preparar estructura

---

## 29.3 Confusión de dominios

Riesgo:

- mezclar auth con negocio

Mitigación:

- Better Auth aislado
- RBAC en dominio

---

## 30. Roadmap del Producto

---

## Fase 1 — MVP (actual)

- reservas
- pagos MP
- dashboard básico
- landing
- calendario
- servicios
- pacientes

---

## Fase 2

- multi-tenant real
- subdominios
- analytics avanzadas
- automatización de recordatorios

---

## Fase 3

- app móvil
- marketplace de profesionales
- IA para optimización de agenda
- integraciones avanzadas

---

# 31. Definición de “Producto Listo para Vender”

El producto está listo cuando:

- un negocio puede operar sin WhatsApp
- puede cobrar automáticamente
- puede gestionar agenda diaria completa
- puede ver ingresos y clientes
- puede recibir reservas desde internet

---

# 32. Filosofía del Producto

---

## 32.1 No es un calendario

Es un sistema operativo para negocios de servicios.

---

## 32.2 No es SaaS todavía

Es un producto instalable y escalable.

---

## 32.3 No es un MVP simple

Es un MVP vendible.

---

## 33. Conclusión Final

Booking Engine está diseñado como un sistema real de operación para negocios de servicios, con capacidad de evolucionar hacia una plataforma SaaS multi-tenant sin reescrituras estructurales.

El enfoque del producto es:

> vender primero, escalar después, sin perder arquitectura.
