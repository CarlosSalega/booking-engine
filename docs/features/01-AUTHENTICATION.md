# 01-authentication.md

> Feature: Authentication  
> Dependency: Better Auth  
> Status: MVP

---

# 1. Objetivo

Proveer un sistema de autenticación seguro y simple para acceso al sistema, utilizando Better Auth como proveedor principal de identidad y sesiones.

---

# 2. Alcance

Incluye:

- Registro de usuario
- Login
- Logout
- Gestión de sesión
- Recuperación de contraseña
- Verificación de email (opcional MVP)
- Protección de rutas

No incluye:

- lógica de negocio de roles
- permisos del sistema (se manejan en dominio)

---

# 3. Modelo de Usuario

```ts
User {
  id: string
  name: string
  email: string
  password: string
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT"
  createdAt: Date
  updatedAt: Date
}
```

---

# 4. Integración con Better Auth

Better Auth es responsable de:

- autenticación
- hashing de contraseña
- sesiones seguras
- cookies httpOnly
- logout seguro
- recuperación de password

---

# 5. Flujo de autenticación

## Registro

```
Usuario → Registro → Better Auth → Sesión creada → Redirección dashboard
```

---

## Login

```
Usuario → Credenciales → Better Auth → Sesión válida → Dashboard
```

---

## Logout

```
Usuario → Logout → Better Auth → Invalidate session
```

---

# 6. Sesiones

- Basadas en cookies httpOnly
- Persistentes
- Invalidables desde servidor
- Seguras por defecto

---

# 7. Protección de rutas

Todas las rutas privadas requieren sesión activa.

Middleware:

- verifica sesión
- redirige a login si no existe

---

# 8. Roles

Los roles son parte del dominio, no de autenticación.

Better Auth solo entrega identidad.

---

Roles disponibles:

- ADMIN
- SECRETARY
- PROFESSIONAL
- PATIENT

---

# 9. Reglas de negocio

- Un usuario debe tener email único
- Password mínimo 8 caracteres
- No se permite acceso sin sesión válida
- Sesión expira automáticamente según configuración

---

# 10. Casos de error

- credenciales inválidas
- email ya registrado
- sesión expirada
- token inválido

---

# 11. Seguridad

- passwords hasheados por Better Auth
- cookies httpOnly
- protección CSRF
- rate limiting (futuro middleware)

---

# 12. Consideraciones técnicas

- integración directa con Prisma Adapter
- uso en Server Components y Server Actions
- soporte SSR
- compatibilidad con middleware de Next.js
