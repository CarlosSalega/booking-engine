# 12-media.md

> Feature: Media  
> Status: MVP

---

# 1. Objetivo

Gestionar todos los recursos multimedia del sistema (imágenes principalmente), utilizando Cloudinary como proveedor externo.

---

# 2. Alcance

Incluye:

- subida de imágenes
- gestión de assets
- optimización automática
- asociación a entidades del sistema
- eliminación de recursos

---

# 3. Tipos de media

## 3.1 Logo del negocio

- branding principal

---

## 3.2 Imágenes de landing

- hero
- secciones informativas
- banners

---

## 3.3 Profesionales

- fotos de perfil
- imágenes descriptivas

---

## 3.4 Servicios

- imágenes representativas

---

## 3.5 Galería general

- contenido visual del negocio

---

# 4. Entidad Media

```ts
Media {
  id: string
  organizationId: string

  url: string
  publicId: string

  type: "LOGO" | "LANDING" | "PROFESSIONAL" | "SERVICE" | "GALLERY"

  relatedId?: string

  createdAt: Date
}
```

---

# 5. Reglas de negocio

- todo asset debe pertenecer a una organización
- no se almacenan archivos en el servidor
- Cloudinary es la fuente de verdad
- imágenes deben optimizarse automáticamente
- eliminación debe sincronizar con Cloudinary

---

# 6. Upload flow

```
Usuario → Upload → Cloudinary → URL → DB → Relación con entidad
```

---

# 7. Validaciones

- tipos de archivo permitidos: jpg, png, webp
- tamaño máximo configurable
- validación en backend

---

# 8. Permisos

- ADMIN: gestión total
- SECRETARY: upload limitado
- PROFESSIONAL: solo su imagen de perfil
- PATIENT: sin acceso

---

# 9. Consideraciones técnicas

- integración con Cloudinary SDK
- transformación automática de imágenes
- CDN caching
- eliminación segura
