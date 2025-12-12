# Gestor de Imágenes para Artículos - Guía Completa

## ✅ Cambios Implementados

### 1. **Formulario NUEVO de Artículos** (`app/(dashboard)/bd/articulos/nuevo/page.tsx`)

#### Layout mejorado:
```
┌─────────────────────────────────┐
│  Tipo de Artículo  │  Vínculo ERP (reducido, 3 cols)
└─────────────────────────────────┘
┌─────────────────────────────────┐
│    NOMBRE (Grande, 100%)         │ ← h-12, text-lg, font-semibold
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Categoría                       │ ← font-bold, text-primary
└─────────────────────────────────┘
... otros campos ...
┌─────────────────────────────────┐
│  Imágenes (5/5)                 │
│  ┌─────────────────────────────┐│
│  │ ImageManager                 ││
│  │ + Añadir imagen              ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

#### Gestor de imágenes:
- ✅ Máximo 5 imágenes
- ✅ Formatos: JPEG, PNG, HEIC
- ✅ Selección de imagen principal
- ✅ Reordenamiento drag & drop
- ✅ Eliminar imágenes
- ✅ Compatible con cámara
- ✅ Bucket: `articulosMice`

#### Logs automáticos:
```javascript
[IMAGES] Nueva imagen añadida: filename.jpg
[IMAGES] Imágenes reordenadas
[IMAGES] Imagen eliminada: img-1702318000000
[IMAGES] Imagen principal actualizada: img-1702318000000
```

### 2. **Formulario EDITOR de Artículos Existentes** (`app/(dashboard)/bd/articulos/[id]/page.tsx`)

#### Cambios:
- ✅ Importa `ImagenArticulo` desde `nuevo/page.tsx`
- ✅ Estado local `imagenes` con datos cargados
- ✅ Carga imágenes al abrir artículo
- ✅ Sección de imágenes en tabs (aplica para ambas: micecatering y entregas)
- ✅ Mismo UI que formulario nuevo
- ✅ Guardado de imágenes en actualización

#### Hook useEffect para cargar:
```typescript
useEffect(() => {
    // Carga articulo con imagenes
    const { data } = await supabase.from('articulos').select('*').eq('id', id).single();
    if (data?.imagenes) setImagenes(data.imagenes);
}, [id]);
```

### 3. **Migración SQL**

Archivo: `migrations/008_add_imagenes_to_articulos.sql`

```sql
ALTER TABLE public.articulos
ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_articulos_imagenes ON public.articulos USING gin (imagenes);
```

**Ejecutar manualmente en Supabase:**
1. Ir a SQL Editor en Supabase
2. Copiar el contenido de la migración
3. Ejecutar

### 4. **Schema Zod Actualizado**

```typescript
imagenes: z.array(z.object({
    id: z.string(),
    url: z.string(),
    esPrincipal: z.boolean(),
    orden: z.number(),
    descripcion: z.string().optional()
})).default([]),
```

### 5. **Formato de Datos Guardados en Supabase**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Coca Cola Zero",
  "categoria": "Bebidas",
  "tipo_articulo": "micecatering",
  "imagenes": [
    {
      "id": "img-1702318000000",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/img-1702318000000",
      "esPrincipal": true,
      "orden": 0,
      "descripcion": "foto-coca-cola.jpg"
    },
    {
      "id": "img-1702318000001",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/img-1702318000001",
      "esPrincipal": false,
      "orden": 1,
      "descripcion": "detalle.png"
    }
  ]
}
```

---

## 🚀 Pasos para Activar

### Paso 1: Ejecutar Migración SQL
```sql
-- En Supabase SQL Editor, ejecutar:
ALTER TABLE public.articulos
ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_articulos_imagenes ON public.articulos USING gin (imagenes);
```

### Paso 2: Verificar en el navegador
1. Ir a `http://localhost:3000/bd/articulos/nuevo`
2. Rellenar formulario
3. Scrollear hasta "Imágenes"
4. Subir una imagen de prueba
5. Guardar artículo
6. Revisar consola para logs `[IMAGES]`

### Paso 3: Verificar guardado en Supabase
```sql
-- En Supabase SQL Editor:
SELECT id, nombre, imagenes FROM public.articulos 
WHERE imagenes != '[]'::jsonb 
LIMIT 1;
```

Deberías ver un JSON con las imágenes.

---

## 🔍 Debugging

### Console Logs Esperados (Crear nuevo artículo):
```
[IMAGES] Nueva imagen añadida: photo.jpg
[FORM] Iniciando submit con datos: { nombre: 'Test', categoria: 'Bebidas', ... }
[SUPABASE] Datos a insertar: { ..., imagenes: [{...}] }
[SUPABASE] Query completada en 245.32ms
[SUCCESS] Artículo insertado: 550e8400-e29b-41d4-a716-446655440000
```

### Console Logs Esperados (Editar artículo):
```
[IMAGES] Nueva imagen añadida: extra.png
[IMAGES] Imágenes reordenadas
[SUPABASE] Query completada en 189.45ms
[SUCCESS] Artículo actualizado: 550e8400-e29b-41d4-a716-446655440000
```

### Errores Comunes

#### ❌ "Límite alcanzado"
```
toast: "Límite alcanzado - Máximo 5 imágenes"
```
**Solución:** Eliminar una imagen antes de añadir otra.

#### ❌ "Cannot find module '@/components/book/images/ImageManager'"
**Solución:** Revisar que el archivo exista en `components/book/images/ImageManager.tsx`

#### ❌ "imagenes column does not exist"
**Solución:** Ejecutar la migración SQL

---

## 📊 Comparación: Formulario Nuevo vs Editor

| Característica | Nuevo | Editor |
|---|---|---|
| Layout mejorado | ✅ | N/A (tabs) |
| Gestor imágenes | ✅ | ✅ |
| Límite 5 imágenes | ✅ | ✅ |
| Carga datos | N/A | ✅ |
| Guardar en insert | ✅ | N/A |
| Guardar en update | N/A | ✅ |
| Logs automáticos | ✅ | ✅ |
| Compatibilidad cámara | ✅ | ✅ |

---

## 💡 Características del ImageManager

### Funcionalidades:
- **Upload:** Selecciona archivos o usa cámara
- **Drag & Drop:** Reordena imágenes
- **Delete:** Elimina con un clic
- **Set Principal:** Marca como imagen principal
- **Preview:** Muestra thumbnails con orden

### Evento onUpload:
```typescript
onUpload={(url: string, filename: string) => {
    // url: URL pública de Supabase Storage
    // filename: Nombre del archivo subido
    const newImage: ImagenArticulo = {
        id: `img-${Date.now()}`,
        url,
        esPrincipal: imagenes.length === 0,
        orden: imagenes.length,
        descripcion: filename
    };
    setImagenes([...imagenes, newImage]);
}}
```

---

## 🔐 Configuración de Supabase Storage

### Bucket requerido: `articulosMice`

**Verificar en Supabase:**
1. Storage → Buckets
2. Debe existir `articulosMice`
3. Política RLS debe permitir:
   - Lectura pública (SELECT)
   - Escritura autenticada (INSERT, UPDATE, DELETE)

Si no existe:
```sql
-- Crear bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('articulosMice', 'articulosMice', true);

-- Políticas
CREATE POLICY "Public Read" ON storage.objects
    FOR SELECT USING (bucket_id = 'articulosMice');

CREATE POLICY "Authenticated Upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'articulosMice' AND auth.role() = 'authenticated');
```

---

## 🎯 Resumen de Archivos Modificados

1. **`app/(dashboard)/bd/articulos/nuevo/page.tsx`**
   - Importa `ImageManager`
   - Define `ImagenArticulo`
   - Añade estado `imagenes`
   - Mejora layout (Nombre grande, Vínculo reducido)
   - Sección de imágenes al final
   - Guarda en `onSubmit`

2. **`app/(dashboard)/bd/articulos/[id]/page.tsx`**
   - Importa `ImageManager` e `ImagenArticulo`
   - Carga imágenes en `useEffect`
   - Sección de imágenes en tabs
   - Actualiza en `onSubmit`

3. **`migrations/008_add_imagenes_to_articulos.sql`**
   - Añade columna `imagenes jsonb`
   - Crea índice para rendimiento

4. **Documentación:**
   - `CAMBIOS_FORMULARIO_ARTICULOS.md`
   - Este archivo

---

## 🎓 Próximos Pasos (Opcional)

### Para Mejorar Aún Más:

1. **Galería Modal para Ver Imágenes:**
   ```typescript
   // Añadir modal para ver imágenes en grande
   // Usar componente Image de Next.js para optimización
   ```

2. **Crop de Imágenes:**
   ```typescript
   // Permitir crop antes de subir
   // Usar librería como react-easy-crop
   ```

3. **Compresión Automática:**
   ```typescript
   // Comprimir imágenes antes de subir
   // Usar librería como browser-image-compression
   ```

4. **Vista Previa en Lista:**
   ```typescript
   // Mostrar imagen principal en tabla de artículos
   ```

---

## ✨ Conclusión

¡Los cambios están listos! El gestor de imágenes está completamente integrado en:
- ✅ Formulario nuevo
- ✅ Editor de existentes
- ✅ Base de datos (migración SQL)
- ✅ Logs de debugging
- ✅ Validación (máximo 5 imágenes)
- ✅ Compatibilidad con cámara

Solo falta ejecutar la migración SQL en Supabase y ¡listo!
