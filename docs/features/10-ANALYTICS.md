# 10-analytics.md

> Feature: Analytics  
> Status: MVP

---

# 1. Objetivo

Proveer métricas básicas del negocio para toma de decisiones, basadas en reservas, pagos y actividad general.

---

# 2. Alcance

Incluye:

- ingresos
- reservas
- cancelaciones
- ocupación de agenda
- servicios más utilizados
- profesionales más activos
- clientes nuevos

---

# 3. Métricas principales

## 3.1 Ingresos

- ingresos diarios
- ingresos mensuales
- ingresos por servicio

---

## 3.2 Reservas

- total de reservas
- reservas confirmadas
- reservas canceladas
- reservas completadas

---

## 3.3 Ocupación

- porcentaje de slots ocupados
- horarios pico
- distribución semanal

---

## 3.4 Clientes

- nuevos clientes
- clientes recurrentes
- frecuencia de visitas

---

# 4. Dashboards

## Vista general

- KPIs principales
- gráficos de evolución
- comparativas mensuales

---

## Vista por profesional

- rendimiento individual
- cantidad de reservas
- ingresos generados

---

## Vista por servicio

- servicios más demandados
- ingresos por servicio
- tasa de conversión

---

# 5. Reglas de negocio

- todos los datos provienen de la base de datos
- métricas deben ser consistentes con pagos y bookings
- no se permite cálculo en frontend

---

# 6. Estados

- loading
- empty
- error
- success

---

# 7. Permisos

- ADMIN: acceso completo
- SECRETARY: acceso parcial
- PROFESSIONAL: solo sus métricas

---

# 8. Consideraciones técnicas

- agregaciones en backend
- consultas optimizadas por rango de fechas
- uso de índices en bookings y payments
- caching de métricas no críticas
