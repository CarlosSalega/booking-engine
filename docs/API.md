# API.md

# API Design

> Este documento define la arquitectura de la API del Booking Engine.

Aunque la aplicación utiliza principalmente **Server Actions** de Next.js, se exponen API Routes para integraciones externas y funcionalidades que requieren endpoints HTTP públicos.

---

# Filosofía

Prioridad de comunicación:

```
UI
 ↓
Server Actions
 ↓
Domain
 ↓
Repository
 ↓
Database
```

Las API Routes existen únicamente cuando son necesarias.

---

# ¿Cuándo usar Server Actions?

Utilizar Server Actions para:

- Crear reservas
- Editar reservas
- Cancelar reservas
- Crear profesionales
- Actualizar perfil
- Actualizar landing
- CRUD de servicios
- CRUD de horarios
- Dashboard
- Panel administrativo

Nunca exponer estos endpoints públicamente.

---

# ¿Cuándo usar API Routes?

Las API Routes se utilizan para:

- Webhooks
- Cloudinary
- Mercado Pago
- Stripe (futuro)
- Google Calendar (futuro)
- Outlook Calendar (futuro)
- Integraciones externas
- Health Checks

---

# Estructura

```
app/

api/

cloudinary/

route.ts

mercadopago/

webhook/

route.ts

health/

route.ts
```

---

# Formato JSON

Respuesta exitosa

```json
{
  "success": true,
  "data": {}
}
```

---

Respuesta con error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

---

# Códigos HTTP

200

OK

---

201

Created

---

204

No Content

---

400

Bad Request

---

401

Unauthorized

---

403

Forbidden

---

404

Not Found

---

409

Conflict

---

422

Validation Error

---

429

Too Many Requests

---

500

Internal Server Error

---

# Validación

Toda entrada debe validarse mediante Zod.

Nunca confiar en:

- body
- params
- query
- headers

---

# Autenticación

Proveedor:

Clerk

La autenticación nunca se implementa manualmente.

---

# Autorización

Toda operación privada valida:

- usuario autenticado
- rol
- ownership
- permisos

---

# API Pública

La landing pública puede consultar:

```
GET /api/professionals/:slug
```

Retorna únicamente información pública.

Nunca:

- email
- teléfono privado
- datos internos
- bookings

---

# Health Check

```
GET /api/health
```

Debe responder:

```json
{
  "status": "ok"
}
```

Utilizado por:

- Railway
- Vercel
- Docker
- Monitoreo

---

# Cloudinary

Endpoint interno:

```
POST /api/cloudinary/signature
```

Responsabilidad:

- verificar autenticación
- generar firma
- devolver timestamp
- devolver signature

Nunca exponer API Secret.

---

# Mercado Pago

Webhook

```
POST /api/mercadopago/webhook
```

Debe:

- validar firma
- registrar evento
- actualizar pago
- actualizar booking

---

# Stripe (Futuro)

```
POST /api/stripe/webhook
```

---

# Google Calendar (Futuro)

```
POST /api/google/calendar
```

---

# Outlook (Futuro)

```
POST /api/outlook/calendar
```

---

# Rate Limiting

Endpoints públicos deben soportar:

- IP Rate Limit
- Bot Protection

Especialmente:

- reservas
- contacto
- login
- webhooks

---

# Idempotencia

Operaciones sensibles:

- pagos
- reservas
- webhooks

Deben ser idempotentes.

Nunca ejecutar dos veces la misma operación.

---

# Versionado

Actualmente:

```
v1
```

Si en el futuro existe API pública estable:

```
/api/v1/
```

---

# Logging

Registrar:

- errores
- duración
- endpoint
- usuario
- IP (cuando aplique)

Nunca registrar:

- passwords
- tokens
- secretos
- información sensible

---

# Seguridad

Headers recomendados:

- CSP
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

Gestionados por Next.js o el proveedor de despliegue.

---

# Timeouts

Toda integración externa debe tener timeout.

Nunca esperar indefinidamente una respuesta.

---

# Retries

Solo para operaciones seguras.

Nunca reintentar automáticamente una creación de reserva o un cobro sin mecanismos de idempotencia.

---

# Principio Final

Las API Routes son una capa de integración.

Toda la lógica de negocio debe residir en el dominio de la aplicación, nunca en los endpoints.
