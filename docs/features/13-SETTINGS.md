# 13-settings.md

> Feature: Settings  
> Status: MVP

---

# 1. Objetivo

Centralizar la configuración global del negocio, permitiendo personalizar reglas operativas, pagos, branding y comportamiento del sistema.

---

# 2. Alcance

Incluye:

- configuración del negocio
- configuración de reservas
- configuración de pagos
- configuración de cancelaciones
- branding
- reglas globales

---

# 3. Configuración general

- nombre del negocio
- descripción
- logo
- dirección
- timezone
- contacto

---

# 4. Configuración de reservas

- duración por defecto
- anticipación mínima de reserva
- límite de reservas por día
- política de cancelación
- buffer entre turnos (futuro)

---

# 5. Configuración de pagos

- habilitar pagos
- tipo por defecto:
  - NONE
  - DEPOSIT
  - FULL
- integración Mercado Pago
- configuración de comisiones

---

# 6. Cancelaciones

- cancelación habilitada/deshabilitada
- tiempo límite de cancelación
- reglas de penalización (futuro)

---

# 7. Branding

- logo
- colores principales
- imagen de portada
- estilo visual de landing

---

# 8. Reglas de negocio

- settings son por organización
- cambios deben ser auditados
- algunos cambios afectan reservas activas
- configuración se cachea para performance

---

# 9. Permisos

- ADMIN: acceso total
- SECRETARY: lectura parcial
- PROFESSIONAL: sin acceso

---

# 10. Consideraciones técnicas

- cache layer para settings
- invalidación al actualizar
- acceso server-side prioritario
