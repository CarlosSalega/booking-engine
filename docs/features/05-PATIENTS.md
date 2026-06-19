# 05-patients.md

> Feature: Patients  
> Status: MVP

---

# 1. Objetivo

Gestionar la información de los clientes/pacientes del sistema, permitiendo su registro automático o manual y el seguimiento de su historial de reservas.

---

# 2. Alcance

Incluye:

- creación automática desde reservas
- creación manual desde dashboard
- edición de datos
- historial de reservas
- notas internas
- búsqueda y filtrado

---

# 3. Entidad Patient

```ts
Patient {
  id: string
  organizationId: string

  fullName: string
  email?: string
  phone?: string

  documentId?: string

  notes?: string

  createdAt: Date
  updatedAt: Date
}
```

---

# 4. Creación de pacientes

## Automática

Se crea un paciente cuando:

- se realiza una reserva como guest
- no existe previamente en el sistema

---

## Manual

Desde dashboard:

- alta directa
- importación futura (CSV)

---

# 5. Historial de reservas

Cada paciente puede ver:

- reservas pasadas
- reservas futuras
- estado de cada reserva
- pagos asociados

---

# 6. Notas internas

Solo visibles para staff:

- observaciones médicas (dermatología)
- preferencias del cliente
- historial relevante

---

# 7. Reglas de negocio

- un paciente puede tener múltiples reservas
- email/telefono pueden ser opcionales
- duplicados deben ser prevenidos por lógica de negocio
- pacientes no requieren login

---

# 8. Búsqueda

Permite búsqueda por:

- nombre
- email
- teléfono
- documento

---

# 9. Permisos

- ADMIN: acceso completo
- SECRETARY: gestión operativa
- PROFESSIONAL: acceso limitado a sus pacientes

---

# 10. Consideraciones técnicas

- indexación por email y teléfono
- deduplicación en creación automática
- paginación obligatoria en listados
