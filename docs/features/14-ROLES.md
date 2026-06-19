# 14-roles.md

> Feature: Roles & Permissions  
> Status: MVP

---

# 1. Objetivo

Definir el sistema de roles y permisos que controla el acceso a funcionalidades del sistema.

---

# 2. Alcance

Incluye:

- definición de roles
- control de acceso por feature
- validación de permisos
- seguridad a nivel backend

---

# 3. Roles del sistema

## 3.1 ADMIN

Acceso total al sistema.

Puede:

- gestionar todo
- modificar settings
- ver analytics
- gestionar pagos
- administrar usuarios

---

## 3.2 SECRETARY

Rol operativo.

Puede:

- gestionar reservas
- gestionar pacientes
- gestionar calendario
- ver dashboard

No puede:

- modificar settings
- acceder a configuraciones críticas

---

## 3.3 PROFESSIONAL

Rol individual.

Puede:

- ver su agenda
- gestionar sus turnos
- ver pacientes asignados
- actualizar disponibilidad

---

## 3.4 PATIENT

Rol cliente.

Puede:

- reservar turnos
- ver sus reservas
- cancelar según reglas
- ver historial

---

# 4. Modelo de permisos

Permisos granulares:

```
booking:create
booking:update
booking:cancel
calendar:view
patients:view
payments:view
settings:update
analytics:view
```

---

# 5. Reglas de negocio

- roles no deben estar acoplados a UI
- permisos se validan en backend
- Better Auth solo maneja identidad
- autorización es dominio del sistema

---

# 6. Jerarquía

```
ADMIN > SECRETARY > PROFESSIONAL > PATIENT
```

---

# 7. Casos de error

- acceso no autorizado
- acción sin permisos
- sesión válida pero sin rol permitido

---

# 8. Consideraciones técnicas

- middleware de autorización
- guards en server actions
- helpers reutilizables de permisos
- separación clara auth vs authorization
