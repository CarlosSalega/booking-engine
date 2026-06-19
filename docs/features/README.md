# FEATURES / PRODUCT MODULES

> Versión: 1.0  
> Base: PRODUCT-SPECIFICATION v2.0  
> Arquitectura: Feature-Based Modules

---

# 1. Objetivo de esta carpeta

Esta carpeta contiene la **especificación funcional detallada de cada módulo del sistema**.

Cada archivo representa:

- un módulo del producto
- una unidad funcional independiente
- una especificación lista para implementación

---

# 2. Relación con el resto del sistema

Estos documentos se basan en:

- PRODUCT-SPECIFICATION.md → visión del producto
- ARCHITECTURE.md → reglas técnicas
- MODULES.md → estructura de código
- ROUTING.md → estructura de rutas

---

# 3. Principio clave

Cada feature debe ser:

> Independiente, testeable y aislada a nivel de dominio.

No debe depender de UI ni de framework.

---

# 4. Lista de Features (MVP)

## CORE FEATURES

- 01-authentication.md
- 02-dashboard.md
- 03-bookings.md
- 04-calendar.md
- 05-patients.md
- 06-professionals.md
- 07-services.md
- 08-payments.md
- 09-landing.md

---

## SECONDARY FEATURES (MVP extendido)

- 10-analytics.md
- 11-notifications.md
- 12-settings.md
- 13-roles.md
- 14-media.md

---

## FUTURE READY (estructural)

- 15-coupons.md
- 16-packages.md
- 17-integrations.md
- 18-seo.md

---

# 5. Orden de implementación recomendado

## Fase 1 (crítico)

1. authentication
2. services
3. professionals
4. bookings
5. calendar

---

## Fase 2 (operativo)

6. payments
7. patients
8. dashboard
9. landing

---

## Fase 3 (valor agregado)

10. analytics
11. notifications
12. media
13. settings

---

## Fase 4 (expansión)

14. roles
15. coupons
16. integrations

---

# 6. Estructura de cada feature

Cada archivo seguirá esta estructura:

```
# Feature Name

## 1. Objetivo

## 2. Alcance

## 3. Reglas de negocio

## 4. Flujos principales

## 5. Estados

## 6. Permisos

## 7. Entidades involucradas

## 8. Validaciones

## 9. API / Actions

## 10. UI esperada

## 11. Edge cases

## 12. Métricas

## 13. Consideraciones técnicas
```

---

# 7. Principios de diseño de features

- Una feature = una responsabilidad del negocio
- No mezclar dominio con UI
- No mezclar pagos con bookings directamente
- Todo pasa por el dominio
- UI es solo representación

---

# 8. Integración con arquitectura

Cada feature se implementa como módulo:

```
src/modules/{feature}
```

Ejemplo:

```
src/modules/bookings
src/modules/payments
src/modules/patients
```

---

# 9. Regla importante

Ninguna feature debe depender directamente de otra feature.

La comunicación debe ser:

- vía dominio
- o vía servicios compartidos

Nunca imports directos entre módulos internos.

---

# 10. MVP Definition

El MVP se considera completo cuando estas features están operativas:

- authentication
- services
- professionals
- bookings
- calendar
- payments
- dashboard
- landing
- patients

---

# 11. Siguiente paso

El siguiente archivo a construir es:

👉 `01-authentication.md`

Este define:

- flujo de login
- roles base
- sesiones con Better Auth
- permisos iniciales
- estructura de usuario

---

# Fin del README de Features
