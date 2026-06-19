# ROADMAP.md

# Product Roadmap

> Este documento define la evolución planificada del Booking Engine.

El objetivo es construir una plataforma modular que pueda crecer desde un sistema de reservas para profesionales independientes hasta una solución SaaS multiempresa.

---

# Visión

Crear un Booking Engine moderno que permita a cualquier profesional gestionar:

- Su agenda
- Sus clientes
- Sus servicios
- Sus pagos
- Su presencia online

Todo desde una única plataforma.

---

# Estado Actual

Versión objetivo:

```text
v1.0.0
```

Enfoque:

MVP funcional listo para producción.

---

# Fase 1 — MVP

## Landing Pública

- Página pública del profesional
- Hero personalizable
- Biografía
- Servicios
- Galería
- Opiniones
- Información de contacto
- SEO optimizado

---

## Reservas

- Calendario disponible
- Selección de servicio
- Selección de fecha
- Selección de hora
- Confirmación
- Cancelación

---

## Dashboard Profesional

- Gestión de perfil
- Gestión de servicios
- Gestión de horarios
- Gestión de vacaciones
- Gestión de reservas
- Gestión de galería
- Gestión de landing

---

## Usuarios

- Registro
- Login
- Recuperación de contraseña
- Verificación de email

---

## Imágenes

Integración completa con Cloudinary:

- Avatar
- Portada
- Landing
- Galería
- Servicios

---

## Administración

- Gestión de usuarios
- Gestión de profesionales
- Moderación básica

---

# Fase 2

## Pagos

Integración con:

- Mercado Pago

Futuro:

- Stripe

Características:

- Pago online
- Pago parcial
- Anticipos
- Reembolsos

---

## Notificaciones

Email

SMS (futuro)

WhatsApp (futuro)

Push (futuro)

Recordatorios automáticos.

---

## Calendarios

Sincronización con:

- Google Calendar
- Outlook Calendar
- Apple Calendar (ICS)

---

## Estadísticas

Dashboard con métricas:

- Reservas
- Ingresos
- Conversión
- Clientes nuevos
- Cancelaciones
- Ocupación

---

# Fase 3

## Multi-Sede

Un profesional podrá gestionar varias ubicaciones.

---

## Equipos

Varios profesionales bajo una misma cuenta.

---

## Asistentes

Roles con permisos limitados.

---

## Recursos

Reservas asociadas a:

- salas
- equipos
- cabinas

---

## Paquetes

Venta de bonos o paquetes de sesiones.

---

## Cupones

Descuentos:

- porcentaje
- importe fijo
- promociones temporales

---

# Fase 4

## SaaS

Multi-tenant.

Cada negocio con:

- dominio propio (futuro)
- configuración independiente
- branding
- facturación

---

## Marketplace

Directorio de profesionales.

Filtros por:

- ciudad
- especialidad
- valoración
- disponibilidad

---

## IA

Asistente para:

- responder consultas
- redactar descripciones
- sugerir horarios
- analizar ocupación

---

## Automatizaciones

- Emails automáticos
- Recordatorios
- Reprogramaciones
- Confirmaciones
- Encuestas de satisfacción

---

# Mejoras Técnicas

## Performance

- Streaming
- Server Components
- Cache inteligente
- Optimización de imágenes
- Lazy Loading

---

## Seguridad

- MFA
- Auditoría avanzada
- Detección de fraude
- Rate Limiting avanzado

---

## Accesibilidad

Cumplimiento de WCAG 2.2 AA.

---

## Internacionalización

Idiomas previstos:

- Español
- Inglés
- Portugués
- Francés

---

## Multi-Moneda

Soporte para:

- EUR
- USD
- MXN
- COP
- CLP
- ARS

---

## Multi-Zona Horaria

Cada profesional trabajará con su propia zona horaria.

Las reservas se mostrarán adaptadas al huso horario del paciente.

---

# Integraciones Futuras

- Zoom
- Google Meet
- Microsoft Teams
- Slack
- Zapier
- Make
- Notion
- HubSpot
- Mailchimp
- Brevo

---

# Aplicaciones Móviles

Futuro desarrollo:

- iOS
- Android

Compartiendo la misma API y reglas de negocio.

---

# Objetivos de Calidad

- Cobertura de tests >80%
- Lighthouse >95
- Accesibilidad WCAG AA
- Tiempo de carga inicial <2 segundos
- Disponibilidad >99.9%

---

# Criterios para Nuevas Funcionalidades

Antes de incorporar una nueva característica debe responderse:

- ¿Aporta valor al usuario?
- ¿Es coherente con la arquitectura?
- ¿Puede implementarse como un módulo independiente?
- ¿Escala correctamente?
- ¿Es mantenible?

Si la respuesta es negativa a cualquiera de estas preguntas, la funcionalidad debe replantearse.

---

# Principio Final

El Booking Engine debe evolucionar de forma incremental, priorizando la estabilidad y la experiencia del usuario sin comprometer la arquitectura del sistema.

Cada nueva funcionalidad debe construirse sobre los principios definidos en el resto de la documentación del proyecto.
