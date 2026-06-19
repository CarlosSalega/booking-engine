# 09-landing.md

> Feature: Landing Page  
> Status: MVP

---

# 1. Objetivo

Proveer una landing page pública para cada negocio que permita mostrar información, generar confianza y convertir visitantes en reservas.

---

# 2. Alcance

Incluye:

- página pública del negocio
- presentación de servicios
- presentación de profesionales
- sección de contacto
- CTA de reserva
- SEO básico
- configuración desde dashboard

---

# 3. Estructura de la Landing

## Secciones principales

- Hero
- Servicios
- Profesionales
- Beneficios
- Testimonios (opcional MVP)
- Galería
- Contacto
- CTA de reserva

---

# 4. Hero Section

Debe incluir:

- nombre del negocio
- descripción corta
- botones CTA:
  - Reservar turno
  - Enviar mensaje

---

# 5. Servicios

- listado de servicios activos
- duración
- precio (si está configurado)
- botón de reserva directa

---

# 6. Profesionales

- nombre
- especialidad
- imagen
- servicios asociados

---

# 7. CTA de reserva

Flujo directo hacia booking system:

```
Landing → Selección de servicio → Reserva
```

---

# 8. Reglas de negocio

- solo servicios activos se muestran
- solo profesionales activos se muestran
- la disponibilidad debe reflejarse en tiempo real
- contenido configurable desde dashboard

---

# 9. SEO

- metadata configurable
- título dinámico
- descripción editable
- estructura semántica optimizada

---

# 10. Configuración

El administrador puede editar:

- textos
- imágenes
- orden de secciones
- visibilidad de bloques

---

# 11. Permisos

- ADMIN: edición completa
- SECRETARY: sin acceso
- PROFESSIONAL: sin acceso

---

# 12. Consideraciones técnicas

- renderizado server-side (SSR)
- optimización SEO
- imágenes desde Cloudinary
- caching ligero para performance
