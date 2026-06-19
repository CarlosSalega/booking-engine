# 06-professionals.md

> Feature: Professionals  
> Status: MVP

---

# 1. Objetivo

Gestionar los profesionales del negocio, su disponibilidad, servicios asociados y su relación con las reservas.

---

# 2. Alcance

Incluye:

- creación de profesionales
- edición de perfil
- asignación de servicios
- configuración de horarios
- gestión de disponibilidad
- visualización de agenda

---

# 3. Entidad Professional

```ts
Professional {
  id: string
  organizationId: string

  fullName: string
  specialty?: string

  bio?: string
  avatarUrl?: string

  isActive: boolean

  createdAt: Date
  updatedAt: Date
}
```

---

# 4. Servicios asociados

Un profesional puede:

- ofrecer múltiples servicios
- compartir servicios con otros profesionales

Relación:

```
Professional ↔ Services (many-to-many)
```

---

# 5. Disponibilidad

Cada profesional tiene:

- horarios laborales
- excepciones
- bloqueos
- días no laborales

---

# 6. Reglas de negocio

- un profesional inactivo no recibe reservas
- no se pueden crear reservas fuera de disponibilidad
- servicios deben estar habilitados para el profesional
- cada profesional tiene agenda independiente

---

# 7. Agenda del profesional

Incluye:

- reservas asignadas
- horarios libres
- bloqueos
- excepciones

---

# 8. Estados

- ACTIVE
- INACTIVE
- SUSPENDED (futuro)

---

# 9. Permisos

- ADMIN: gestión total
- SECRETARY: gestión operativa
- PROFESSIONAL: solo su perfil y agenda

---

# 10. Consideraciones técnicas

- queries optimizadas por profesionalId
- caching de disponibilidad
- validación server-side de asignación de servicios
- relación many-to-many con services
