# PRODUCT-SPECIFICATION.md

> Versión: 2.0  
> Estado: MVP Definition  
> Tipo: Product Requirements Document (PRD)  
> Sistema: Booking Engine

---

# 1. Visión del Producto

Booking Engine es una plataforma de gestión de turnos y reservas diseñada para profesionales y negocios de servicios que necesitan una solución simple, moderna y completa para operar su negocio.

El objetivo es reemplazar herramientas fragmentadas como:

- WhatsApp para coordinación de turnos
- Google Calendar para agenda
- Excel para control de pacientes/clientes
- Formularios externos para reservas
- Procesos manuales de cobro

---

# 2. Propuesta de Valor

Booking Engine centraliza:

- Reservas online
- Gestión de clientes/pacientes
- Gestión de profesionales
- Agenda inteligente
- Cobros integrados (Mercado Pago Checkout Pro)
- Landing page pública del negocio
- Dashboard operativo
- Estadísticas del negocio

Todo en un solo sistema.

---

# 3. Modelo de Producto

## 3.1 Estado actual del sistema

El sistema es:

> **Single-Tenant por instancia**

Cada cliente tiene su propia instalación del sistema.

Ejemplo:

```
cliente-a.com → instancia A
cliente-b.com → instancia B
```

---

## 3.2 Preparación futura (Multi-Tenant Ready)

Aunque el sistema es single-tenant, toda la arquitectura está diseñada para evolucionar a multi-tenant sin refactor profundo.

Se utiliza el concepto:

```
Organization (base futura del tenant)
```

Todas las entidades principales están asociadas a una organización:

- Professionals
- Patients
- Services
- Bookings
- Payments

---

# 4. Problema

Los negocios de servicios enfrentan:

- Falta de organización en agendas
- Cancelaciones sin control
- Ausencia de pagos anticipados
- Mala experiencia de reserva
- Gestión manual de clientes
- Falta de métricas del negocio
- Dependencia de herramientas externas

---

# 5. Solución

Booking Engine unifica todo el ciclo operativo:

```
Cliente reserva →
Sistema valida disponibilidad →
Cliente paga (opcional) →
Reserva confirmada →
Recordatorio automático →
Gestión en dashboard
```

---

# 6. Alcance del MVP

El MVP está diseñado para ser vendible desde el día 1.

Incluye:

- Sistema de reservas completo
- Agenda profesional
- Gestión de servicios
- Gestión de pacientes
- Dashboard básico
- Landing page editable
- Sistema de pagos con Mercado Pago
- Roles y permisos básicos

---

# 7. Objetivo del MVP

Permitir que un negocio pueda operar completamente sin herramientas externas.

---

## Un negocio debe poder:

- Publicar su disponibilidad
- Recibir reservas online
- Cobrar reservas (seña o total)
- Gestionar su agenda
- Administrar clientes
- Visualizar ingresos básicos
- Tener una landing pública funcional

---

# 8. Modelo de Negocio

El producto será vendido como:

> Licencia única por cliente (no SaaS inicialmente)

Incluye:

- Instalación del sistema
- Configuración personalizada
- Hosting gestionado

---

# 9. Roles del Sistema

## 9.1 Administrador

Control total del negocio.

- Profesionales
- Servicios
- Agenda
- Clientes
- Dashboard
- Pagos
- Landing
- Configuración

---

## 9.2 Secretaria

- Gestión de reservas
- Gestión de agenda
- Gestión de clientes

---

## 9.3 Profesional

- Ver agenda
- Gestionar disponibilidad
- Ver pacientes asignados
- Gestionar turnos

---

## 9.4 Cliente/Paciente

- Reservar turnos
- Cancelar reservas (según reglas)
- Ver historial

---

# 10. Arquitectura General

El sistema se basa en arquitectura modular:

```
Modules
 ├── bookings
 ├── calendar
 ├── payments
 ├── patients
 ├── services
 ├── professionals
 ├── dashboard
 ├── landing
 ├── auth
 ├── settings
```

---

## 10.1 Principios Arquitectónicos

- Feature-Based Modules
- Clean Architecture interna por módulo
- Separación Domain / Application / Infrastructure
- UI desacoplada del dominio
- API consistente
- Lógica de negocio independiente del framework

---

# 11. Stack Tecnológico

## Frontend

- Next.js (App Router)
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui

---

## Backend

- Next.js Server Actions
- Prisma ORM
- PostgreSQL (NeonDB)

---

## Auth

- Better Auth

Responsable de:

- login
- sesiones
- autenticación
- cookies seguras

NO maneja:

- roles de negocio
- permisos del sistema

---

## Pagos

- Mercado Pago Checkout Pro (CORE MVP)

Encapsulado en módulo Payments.

---

## Storage

- Cloudinary

---

# 12. Integraciones del MVP

- Better Auth
- Mercado Pago Checkout Pro
- Cloudinary
- Email (Resend o similar)

---

# 13. Restricciones del MVP

No incluye:

- multi-tenant real
- app mobile
- chat interno
- IA
- marketplace
- automatizaciones complejas
- ERP integrations

---

# 14. Principios del Producto

## Simplicidad

El sistema debe ser fácil de usar para cualquier profesional.

---

## Automatización

Reducir trabajo manual del negocio.

---

## Control

El administrador debe tener control total del sistema.

---

## Flexibilidad

Cada negocio puede configurar:

- horarios
- servicios
- precios
- pagos
- políticas de cancelación

---

## Escalabilidad

Preparado para:

- múltiples sedes
- múltiples profesionales
- multi-tenant futuro

---

# 15. Modelo de Datos Conceptual

```
Organization (future tenant root)
 ├── Professionals
 ├── Patients
 ├── Services
 ├── Bookings
 ├── Payments
 ├── Schedule
 ├── Landing
```

---

# 16. Criterios de Éxito del MVP

El sistema se considera exitoso si:

- Un negocio puede operar sin WhatsApp ni Excel
- Puede recibir reservas reales
- Puede cobrar online con Mercado Pago
- Puede gestionar su agenda diaria
- Puede ver ingresos básicos
- Puede administrar clientes y servicios

---

# 17. Diferenciación del Producto

No es solo un calendario.

Es un sistema operativo para negocios de servicios:

- agenda
- pagos
- clientes
- landing
- métricas
- administración

---

# 18. Evolución del Producto

## Fase 1 (MVP)

- Single tenant
- reservas
- pagos MP
- dashboard básico

---

## Fase 2

- multi-tenant real
- subdominios
- analytics avanzadas
- automatizaciones

---

## Fase 3

- marketplace
- integraciones externas
- app móvil
- IA

---

# 19. Conclusión

Booking Engine es un sistema diseñado para ser funcional desde el primer cliente, pero arquitectónicamente preparado para evolucionar hacia una plataforma SaaS completa sin reescrituras profundas.

La prioridad del MVP es:

> vender, operar y validar producto real

no sobre-ingeniería.
