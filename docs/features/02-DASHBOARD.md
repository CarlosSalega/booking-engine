# 02-dashboard.md

> Feature: Dashboard  
> Status: MVP

---

# 1. Objetivo

Proveer una vista centralizada del negocio con métricas, accesos rápidos y estado operativo en tiempo real.

---

# 2. Alcance

Incluye:

- métricas del negocio
- resumen de reservas
- ingresos
- actividad reciente
- accesos rápidos
- gráficos básicos

---

# 3. Layout

El dashboard se compone de:

- header con resumen general
- grid de métricas
- sección de gráficos
- agenda del día
- actividad reciente

---

# 4. Métricas principales

- reservas del día
- reservas de la semana
- ingresos del mes
- cancelaciones
- clientes nuevos
- ocupación del calendario

---

# 5. Widgets

## 5.1 Reservas del día

Lista de turnos próximos.

---

## 5.2 Ingresos

Resumen de pagos confirmados.

---

## 5.3 Clientes nuevos

Usuarios registrados recientemente.

---

## 5.4 Ocupación

Porcentaje de slots ocupados.

---

## 5.5 Servicios más usados

Ranking de servicios.

---

# 6. Gráficos

- ingresos por mes
- reservas por día
- distribución por profesional
- horarios más demandados

---

# 7. Accesos rápidos

- crear reserva
- crear cliente
- bloquear horario
- ver calendario
- editar servicios

---

# 8. Reglas de negocio

- datos siempre reflejan estado real de base de datos
- no se cachean métricas críticas sin invalidación
- solo usuarios con permisos pueden acceder

---

# 9. Estados

- loading
- empty state
- error state
- success state

---

# 10. Permisos

- ADMIN: acceso completo
- SECRETARY: acceso operativo
- PROFESSIONAL: acceso limitado a su información

---

# 11. Consideraciones técnicas

- queries optimizadas por rango de fechas
- agregaciones en backend
- uso de server actions
- paginación en listas
