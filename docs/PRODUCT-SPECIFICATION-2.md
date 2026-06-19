# 20. Funcionalidades del MVP

Esta sección define todas las capacidades funcionales que debe tener el sistema en su primera versión operativa.

---

# 20.1 Sistema de Reservas (CORE)

El sistema de reservas es el núcleo del producto.

Permite que un cliente pueda reservar un turno en base a:

- Profesional
- Servicio
- Disponibilidad
- Reglas de negocio del negocio

---

## Flujo de reserva pública

```
Landing →
Seleccionar servicio →
Seleccionar profesional →
Ver disponibilidad →
Seleccionar horario →
Ingresar datos →
Pago (opcional) →
Confirmación
```

---

## Estados de una reserva

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

## Reglas de negocio

- No se pueden solapar turnos
- Cada servicio tiene duración configurable
- Cada profesional tiene su propia disponibilidad
- Se deben respetar excepciones de calendario
- El sistema debe validar disponibilidad en tiempo real

---

## Configuración por servicio

Cada servicio puede definir:

- duración (default 30 min)
- precio
- requiere pago (sí/no)
- tipo de pago:
  - sin pago
  - seña
  - pago completo
- monto de seña
- profesionales asignados

---

# 20.2 Calendario

El calendario es la herramienta operativa del negocio.

---

## Funcionalidades

- Vista diaria
- Vista semanal
- Vista mensual
- Drag & drop de reservas
- Reprogramación
- Bloqueo de horarios
- Excepciones
- Vacaciones
- Horarios personalizados

---

## Reglas

- El calendario refleja disponibilidad real
- Las reservas pagadas tienen prioridad
- Los bloques de excepción invalidan disponibilidad
- El buffer entre turnos se aplica automáticamente (configurable futuro)

---

# 20.3 Gestión de Profesionales

Cada negocio puede tener uno o múltiples profesionales.

---

## Datos de un profesional

- nombre
- especialidad
- imagen
- bio
- servicios asignados
- horarios
- disponibilidad
- estado (activo/inactivo)

---

## Reglas

- Un profesional puede tener múltiples servicios
- Un servicio puede ser compartido entre profesionales
- Cada profesional tiene agenda independiente

---

# 20.4 Gestión de Servicios

Los servicios representan lo que se ofrece.

---

## Campos

- nombre
- duración
- precio
- requiere pago
- tipo de pago
- profesionales asociados
- categoría
- activo/inactivo

---

## Reglas

- Un servicio define la duración de la reserva
- Puede tener precios distintos por negocio
- Puede requerir pago obligatorio o opcional

---

# 20.5 Pacientes / Clientes

Sistema de base de datos de clientes.

---

## Funcionalidades

- Crear cliente automáticamente al reservar
- Historial de reservas
- Notas internas
- Información de contacto
- Búsqueda rápida

---

## Reglas

- Un cliente puede tener múltiples reservas
- El cliente no necesita cuenta obligatoria
- Se puede reservar como invitado

---

# 20.6 Landing Page

Landing pública editable por el administrador.

---

## Secciones

- Hero
- Servicios
- Profesionales
- Testimonios
- Galería
- FAQ
- Contacto
- CTA de reserva

---

## Reglas

- Totalmente configurable desde dashboard
- SEO optimizada
- Debe reflejar disponibilidad real de reservas

---

# 20.7 Sistema de Pagos (CORE)

Integración con Mercado Pago Checkout Pro.

---

## Flujos

### Sin pago

```
Reserva → Confirmación directa
```

---

### Con seña

```
Reserva →
Pago seña →
Confirmación parcial →
Pago restante (futuro)
```

---

### Pago completo

```
Reserva →
Pago total →
Confirmación automática
```

---

## Estados de pago

```
PENDING
APPROVED
REJECTED
CANCELLED
REFUNDED (futuro)
```

---

## Reglas críticas

- El pago está vinculado a una reserva
- Webhooks son fuente de verdad
- No se puede confirmar reserva sin pago si es obligatorio
- Idempotencia obligatoria en pagos

---

# 20.8 Dashboard

El dashboard es el centro operativo del sistema.

---

## Widgets principales

- Reservas de hoy
- Próximas reservas
- Ingresos del mes
- Clientes nuevos
- Cancelaciones
- Ocupación de agenda
- Servicios más solicitados

---

## Gráficos

- ingresos por mes
- reservas por día
- ocupación por horario
- rendimiento por profesional

---

## Acciones rápidas

- crear reserva
- crear cliente
- bloquear horario
- ver calendario
- editar landing

---

# 20.9 Gestión de Horarios

Sistema flexible de disponibilidad.

---

## Funcionalidades

- horarios por profesional
- días laborales configurables
- excepciones (feriados, vacaciones)
- bloqueos manuales
- horarios especiales

---

## Reglas

- disponibilidad = horarios - reservas - excepciones
- validación en tiempo real

---

# 20.10 Roles y Permisos

Sistema RBAC interno.

---

## Roles

- ADMIN
- PROFESSIONAL
- SECRETARY
- PATIENT

---

## Reglas

- Better Auth solo maneja identidad
- permisos viven en el dominio
- cada acción valida permisos en backend

---

# 20.11 Notificaciones

Sistema de notificaciones básico.

---

## Tipos

- confirmación de reserva
- cancelación
- recordatorio
- pago aprobado
- pago rechazado

---

## Canales

- email (MVP)
- dashboard (MVP)
- WhatsApp (futuro)

---

# 20.12 Gestión de Multimedia

Integración con Cloudinary.

---

## Funcionalidades

- subir imágenes
- optimización automática
- galería de profesionales
- imágenes de landing
- logo del negocio

---

# 20.13 Auditoría

Registro de acciones críticas.

---

## Eventos

- creación de reserva
- cancelación
- pago
- login
- cambios de horarios
- cambios de servicios

---

# 21. Reglas Globales del Sistema

---

## 21.1 Consistencia de datos

- La base de datos es la fuente de verdad
- Webhooks validan pagos
- No confiar en estado del frontend

---

## 21.2 Disponibilidad

- no se permiten doble reservas
- validación server-side obligatoria

---

## 21.3 Seguridad

- acceso basado en roles
- validación en backend obligatoria
- nunca confiar en cliente

---

## 21.4 UX

- flujo de reserva en menos de 1 minuto
- mínimo número de pasos
- mobile-first

---

## 21.5 Performance

- carga rápida del calendario
- paginación en listados
- caching donde aplique

---

# 22. Dependencias del Sistema

- Better Auth → identidad
- Mercado Pago → pagos
- Prisma → persistencia
- PostgreSQL → base de datos
- Cloudinary → media
- Next.js → frontend + backend

---

# 23. Resumen de MVP

El MVP permite:

- crear negocio operativo completo
- recibir reservas reales
- cobrar por reservas
- gestionar agenda
- administrar clientes
- visualizar métricas básicas
- tener landing pública funcional

---

# Fin de Parte 2
