# 11-notifications.md

> Feature: Notifications  
> Status: MVP

---

# 1. Objetivo

Proveer un sistema básico de notificaciones para mantener informados a usuarios y staff sobre eventos importantes del sistema.

---

# 2. Alcance

Incluye:

- notificaciones de reservas
- notificaciones de pagos
- recordatorios
- cancelaciones
- eventos del sistema

---

# 3. Tipos de notificación

## 3.1 Reserva creada

- confirmación de turno
- detalles del servicio

---

## 3.2 Reserva cancelada

- aviso al paciente
- aviso al profesional

---

## 3.3 Pago aprobado

- confirmación automática
- actualización de estado

---

## 3.4 Recordatorios

- 24h antes del turno (futuro configurable)
- 2h antes del turno (futuro configurable)

---

# 4. Canales

## MVP

- notificación dentro del sistema
- email

---

## Futuro

- WhatsApp
- push notifications

---

# 5. Reglas de negocio

- notificaciones no bloquean el flujo principal
- deben ser asíncronas
- deben ser idempotentes
- pueden reintentarse

---

# 6. Estados

- pending
- sent
- failed

---

# 7. Permisos

- ADMIN: todas las notificaciones
- SECRETARY: operativas
- PROFESSIONAL: relacionadas a su agenda
- PATIENT: solo propias

---

# 8. Consideraciones técnicas

- sistema basado en eventos
- cola de notificaciones (futuro)
- logging de envíos
