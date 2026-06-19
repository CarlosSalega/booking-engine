# 04-calendar.md

> Feature: Calendar  
> Status: MVP

---

# 1. Objetivo

Proveer una vista visual operativa del sistema de reservas, permitiendo gestionar disponibilidad, turnos y agenda diaria/semanal.

---

# 2. Alcance

Incluye:

- vista diaria
- vista semanal
- vista mensual
- visualización de reservas
- creación rápida de reservas
- bloqueo de horarios
- reprogramación visual

---

# 3. Tipos de vista

## 3.1 Daily View

- agenda por horas
- foco en operación diaria

---

## 3.2 Weekly View

- distribución de carga
- planificación

---

## 3.3 Monthly View

- visión macro del negocio

---

# 4. Interacciones

- click para crear reserva
- drag & drop para mover reservas
- resize de bloques (futuro)
- click para ver detalle

---

# 5. Estados del calendario

- ocupado
- disponible
- bloqueado
- excepción
- no laboral

---

# 6. Bloqueos

Permite bloquear horarios manualmente:

- reuniones internas
- feriados
- vacaciones
- mantenimiento

---

# 7. Reglas de negocio

- el calendario refleja bookings reales
- no puede mostrar slots inválidos
- respeta horarios del profesional
- respeta excepciones globales

---

# 8. Disponibilidad

Se calcula como:

```
horario profesional
- reservas existentes
- bloqueos manuales
- excepciones
```

---

# 9. Integración con bookings

- toda creación de reserva impacta el calendario
- cambios en calendario actualizan bookings

---

# 10. Permisos

- ADMIN: acceso total
- SECRETARY: operación
- PROFESSIONAL: propio calendario

---

# 11. Consideraciones técnicas

- renderizado eficiente de slots
- virtualización de listas
- caching de disponibilidad
- queries por rango de fechas
