# SECURITY.md

# Security Guidelines

> Este documento define las políticas de seguridad del Booking Engine.

La seguridad debe considerarse desde el diseño de la aplicación y no como una característica añadida posteriormente.

---

# Principios

Todos los datos que provienen del cliente son considerados no confiables.

Toda validación crítica ocurre en el servidor.

Nunca confiar únicamente en el frontend.

---

# Autenticación

Proveedor:

- Clerk

La aplicación no implementa autenticación propia.

Características requeridas:

- Login seguro
- Password hashing
- OAuth
- Email Verification
- Multi-Factor Authentication (futuro)
- Session Management

---

# Autorización

Toda operación privada debe verificar:

- Usuario autenticado
- Rol
- Propietario del recurso
- Permisos

Ejemplo:

Un profesional únicamente puede modificar:

- Su perfil
- Sus servicios
- Sus horarios
- Sus reservas

Nunca los de otro profesional.

---

# Roles

Actualmente:

```text
ADMIN

PROFESSIONAL

PATIENT
```

Preparado para:

```text
ASSISTANT

SUPER_ADMIN

STAFF
```

---

# Validación

Toda entrada debe validarse utilizando Zod.

Validar siempre:

- body
- params
- query
- headers
- cookies

Nunca asumir que un dato es correcto.

---

# Protección contra SQL Injection

Prisma utiliza consultas parametrizadas.

Nunca construir consultas SQL concatenando strings.

Incorrecto:

```sql
SELECT * FROM users WHERE email = '${email}'
```

---

# XSS

Escapar automáticamente el contenido renderizado.

Nunca utilizar:

```tsx
dangerouslySetInnerHTML;
```

Salvo contenido previamente sanitizado.

---

# CSRF

Las Server Actions proporcionan protección integrada.

Las API Routes públicas deben verificar:

- origen
- autenticación
- tokens cuando corresponda

---

# Rate Limiting

Aplicar límites en:

- Login
- Registro
- Reservas
- Contacto
- Webhooks

Objetivos:

- evitar abuso
- prevenir ataques automatizados
- reducir spam

---

# Secrets

Nunca almacenar:

- API Keys
- Tokens
- Passwords
- Secret Keys

Dentro del código fuente.

Siempre utilizar:

```text
.env.local
```

En producción:

Variables de entorno del proveedor.

---

# Variables Sensibles

Ejemplos:

```text
DATABASE_URL

CLERK_SECRET_KEY

CLERK_PUBLISHABLE_KEY

NEXTAUTH_SECRET

CLOUDINARY_API_SECRET

MERCADOPAGO_ACCESS_TOKEN
```

Nunca exponerlas al cliente.

---

# Variables Públicas

Solo pueden exponerse mediante:

```text
NEXT_PUBLIC_
```

Ejemplo:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

Nunca utilizar este prefijo para secretos.

---

# Cloudinary

Nunca subir imágenes utilizando el API Secret desde el navegador.

Proceso:

Cliente

↓

Solicita firma

↓

Servidor genera signature

↓

Cliente sube imagen

↓

Cloudinary

---

# Archivos

Tipos permitidos:

- jpg
- jpeg
- png
- webp
- avif

Bloquear:

- exe
- js
- php
- html
- svg (si no se sanitiza)
- archivos desconocidos

---

# Tamaño Máximo

Definir límites para cada tipo.

Ejemplo:

Avatar

5 MB

Landing

10 MB

Galería

8 MB

---

# Sanitización

Todo texto ingresado por usuarios debe limpiarse antes de almacenarse o mostrarse cuando exista riesgo de contenido HTML.

---

# Logs

Registrar:

- errores
- accesos
- intentos fallidos
- eventos críticos

Nunca registrar:

- passwords
- tokens
- cookies
- secretos
- datos bancarios

---

# Cookies

Siempre:

- HttpOnly
- Secure
- SameSite

Nunca almacenar información sensible en Local Storage.

---

# HTTPS

Toda la aplicación debe funcionar únicamente bajo HTTPS en producción.

No permitir tráfico HTTP sin redirección.

---

# CORS

Restringir únicamente a los dominios necesarios.

No utilizar:

```text
*
```

En producción.

---

# Dependencias

Actualizar periódicamente:

- Next.js
- React
- Prisma
- Clerk
- Zod
- Tailwind

Eliminar dependencias sin uso.

---

# Auditoría

Registrar eventos como:

- Login
- Logout
- Cambio de contraseña
- Cambio de email
- Cancelación de reserva
- Modificación de horarios
- Eliminación de servicios

Preparado para implementar Audit Logs.

---

# Copias de Seguridad

La estrategia depende del proveedor de PostgreSQL.

Debe existir:

- backups automáticos
- restauración
- versionado

---

# Errores

Nunca mostrar errores internos al usuario.

Incorrecto:

```text
PrismaClientKnownRequestError...
```

Correcto:

```text
Ha ocurrido un error. Inténtalo nuevamente.
```

Los detalles técnicos solo deben registrarse en logs.

---

# Principio de Mínimos Privilegios

Cada usuario debe tener únicamente los permisos estrictamente necesarios.

Nunca otorgar permisos globales por comodidad.

---

# Seguridad por Diseño

Toda nueva funcionalidad debe responder antes de implementarse:

- ¿Quién puede acceder?
- ¿Qué datos expone?
- ¿Qué datos modifica?
- ¿Cómo se valida?
- ¿Qué ocurre si falla?
- ¿Puede ser explotada?

---

# Principio Final

La seguridad no depende del frontend.

Toda decisión crítica debe ejecutarse y validarse en el servidor.
