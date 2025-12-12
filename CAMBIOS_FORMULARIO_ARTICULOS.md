# Cambios Implementados - Formulario de Artículos

## 1. ✅ Mejoras al Layout del Formulario

### Cambios en la estructura:
- **Tipo de Artículo**: Reducido a 1 columna (MD)
- **Vínculo ERP**: Ahora toma 3 columnas (MD) - más compacto
- **Nombre**: Campo nuevo en fila propia, grande y destacado
  - Altura: 48px (`h-12`)
  - Texto: Tamaño lg y semibold
  - Ancho: 100%
- **Categoría**: Añadida la clase `font-bold` y `text-primary`

## 2. ✅ Gestor de Imágenes Incorporado

### Características:
- Ubicación: **Al final del formulario** (después de "URL documentación Drive")
- Máximo: **5 imágenes**
- Formatos soportados: JPEG, PNG, HEIC
- Funcionalidades:
  - ✅ Subir imágenes con Preview
  - ✅ Seleccionar imagen principal
  - ✅ Reordenar imágenes (drag & drop)
  - ✅ Eliminar imágenes
  - ✅ Compatibilidad con cámara
  - ✅ Bucket: `articulosMice`

### UI:
```
Imágenes (3/5)  [📷 principal] [📷] [📷]
┌─────────────────────────────────────┐
│                                     │
│  ImageManager (drag & drop)         │
│  + Añadir imagen                    │
│                                     │
└─────────────────────────────────────┘
```

## 3. ✅ Actualización del Schema Zod

Se añadió el campo `imagenes`:
```typescript
imagenes: z.array(z.object({
    id: z.string(),
    url: z.string(),
    esPrincipal: z.boolean(),
    orden: z.number(),
    descripcion: z.string().optional()
})).default([]),
```

## 4. ✅ Actualización de onSubmit

El campo `imagenes` se guarda en Supabase:
```javascript
imagenes: imagenes,  // Array de objetos ImagenArticulo
```

## 5. ✅ Debug Logs para Imágenes

Se añadieron logs automáticos:
```javascript
'[IMAGES] Nueva imagen añadida: filename'
'[IMAGES] Imágenes reordenadas'
'[IMAGES] Imagen eliminada: id'
'[IMAGES] Imagen principal actualizada: id'
```

## 6. ✅ Migración SQL

Se creó: `migrations/008_add_imagenes_to_articulos.sql`

Añade:
- Campo `imagenes jsonb DEFAULT '[]'::jsonb`
- Índice GIN para optimización
- Comentarios descriptivos

## 📋 TODO Pendiente

### Para el editor de artículos existentes (`app/(dashboard)/bd/articulos/[id]/page.tsx`):

1. **Importar necesarios:**
   ```typescript
   import { ImageManager } from '@/components/book/images/ImageManager';
   import type { ImagenArticulo } from '@/types'; // o exportar desde nuevo/page.tsx
   ```

2. **Estado para imágenes:**
   ```typescript
   const [imagenes, setImagenes] = useState<ImagenArticulo[]>([]);
   ```

3. **Cargar imágenes al inicializar:**
   ```typescript
   useEffect(() => {
       const { data } = await supabase.from('articulos').select('*').eq('id', id).single();
       if (data?.imagenes) {
           setImagenes(data.imagenes);
       }
   }, [id]);
   ```

4. **Añadir sección de imágenes** en el formulario (antes del cierre de Card)

5. **Actualizar onSubmit** para guardar imágenes:
   ```typescript
   .update({
       // ... otros campos
       imagenes: imagenes,
   })
   ```

## 🚀 Pasos para Completar

1. Ejecutar la migración SQL en Supabase:
   ```sql
   -- Copiar contenido de migrations/008_add_imagenes_to_articulos.sql
   ```

2. Actualizar el editor de artículos existentes (`[id]/page.tsx`):
   - Copiar la sección de imágenes del formulario nuevo
   - Ajustar para el formato de tabs si es necesario

3. Probar en desarrollo:
   - Crear nuevo artículo con imágenes
   - Verificar que se guardan en Supabase
   - Editar artículo existente y verificar imágenes

## 📊 Estructura de Datos

```javascript
// Tabla: articulos
{
  id: uuid,
  nombre: text,
  categoria: text,
  // ... otros campos
  imagenes: [
    {
      id: "img-1702318000000",
      url: "https://bucket.supabase.co/...",
      esPrincipal: true,
      orden: 0,
      descripcion: "foto-articulo.jpg"
    },
    // ...máximo 5 imágenes
  ]
}
```

## 🔍 Console Logs Esperados

Cuando subes una imagen:
```
[IMAGES] Nueva imagen añadida: foto-articulo.jpg
[FORM] Iniciando submit con datos: { nombre: '...', ... }
[SUPABASE] Datos a insertar: { ..., imagenes: [...] }
[SUPABASE] Query completada en 245.32ms
[SUCCESS] Artículo insertado: 550e8400-...
```

## ✨ Notas Importantes

- Las imágenes se guardan en el bucket `articulosMice` de Supabase
- Compatible con cámara (enableCamera: true)
- El módulo ImageManager maneja automáticamente compresión y optimización
- Si alcanzas 5 imágenes, aparecerá un toast indicando el límite
- La imagen principal se selecciona con un botón "Principal" en el gestor

