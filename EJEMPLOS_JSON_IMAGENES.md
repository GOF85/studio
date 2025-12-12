# 📦 EJEMPLOS DE JSON - IMAGENES EN SUPABASE

## 📋 ESTRUCTURA EXACTA

Cuando guardas un artículo con imágenes, esto es lo que se envía a Supabase:

---

## 1️⃣ CREAR ARTÍCULO NUEVO (SIN IMÁGENES)

```json
{
  "nombre": "Coca Cola Zero 330ml",
  "tipo_articulo": "micecatering",
  "categoria": "Bebidas",
  "precio_venta": 2.50,
  "precio_alquiler": 0,
  "stock": 100,
  "unidad": "Unidad",
  "imagenes": []
}
```

**Resultado en BD:**
- Columna `imagenes`: `[]` (vacío)
- Tipo: `jsonb`

---

## 2️⃣ CREAR ARTÍCULO CON 1 IMAGEN

```json
{
  "nombre": "Coca Cola Zero 330ml",
  "tipo_articulo": "micecatering",
  "categoria": "Bebidas",
  "precio_venta": 2.50,
  "precio_alquiler": 0,
  "stock": 100,
  "unidad": "Unidad",
  "imagenes": [
    {
      "id": "img-1702318000000",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000000",
      "esPrincipal": true,
      "orden": 0,
      "descripcion": "coca-cola-botella.jpg"
    }
  ]
}
```

**Estructura de cada imagen:**
```typescript
interface ImagenArticulo {
  id: string;              // "img-1702318000000"
  url: string;             // URL pública de Supabase Storage
  esPrincipal: boolean;    // true si es la portada
  orden: number;           // 0, 1, 2... (orden en galería)
  descripcion: string;     // nombre original del archivo
}
```

---

## 3️⃣ CREAR ARTÍCULO CON MÚLTIPLES IMÁGENES

```json
{
  "nombre": "Pack Bebidas Variadas",
  "tipo_articulo": "entregas",
  "categoria": "Packs",
  "precio_venta": 15.00,
  "precio_alquiler": 2.50,
  "stock": 50,
  "unidad": "Pack",
  "imagenes": [
    {
      "id": "img-1702318000000",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000000",
      "esPrincipal": true,
      "orden": 0,
      "descripcion": "pack-bebidas-frente.jpg"
    },
    {
      "id": "img-1702318000001",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000001",
      "esPrincipal": false,
      "orden": 1,
      "descripcion": "pack-bebidas-lateral.png"
    },
    {
      "id": "img-1702318000002",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000002",
      "esPrincipal": false,
      "orden": 2,
      "descripcion": "pack-bebidas-arriba.jpg"
    },
    {
      "id": "img-1702318000003",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000003",
      "esPrincipal": false,
      "orden": 3,
      "descripcion": "pack-bebidas-detalle.heic"
    }
  ]
}
```

**Nota:** En este ejemplo:
- 3 JPG + 1 HEIC
- 4 imágenes total (máximo 5)
- Primera es principal (`esPrincipal: true`)
- Orden secuencial: 0, 1, 2, 3
- Cada una con su propia URL en Storage

---

## 4️⃣ CAMBIAR IMAGEN PRINCIPAL (EDIT)

Mismo JSON que arriba, pero cambias `esPrincipal`:

```json
{
  // ... resto del artículo ...
  "imagenes": [
    {
      "id": "img-1702318000000",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000000",
      "esPrincipal": false,    // ← ERA true, AHORA false
      "orden": 0,
      "descripcion": "pack-bebidas-frente.jpg"
    },
    {
      "id": "img-1702318000001",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000001",
      "esPrincipal": true,     // ← ERA false, AHORA true
      "orden": 1,
      "descripcion": "pack-bebidas-lateral.png"
    }
    // ...
  ]
}
```

---

## 5️⃣ REORDENAR IMÁGENES (EDIT)

Cambias el campo `orden`:

```json
{
  // ... resto del artículo ...
  "imagenes": [
    {
      "id": "img-1702318000001",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000001",
      "esPrincipal": true,
      "orden": 0,              // ← ERA 1, AHORA 0 (se movió al principio)
      "descripcion": "pack-bebidas-lateral.png"
    },
    {
      "id": "img-1702318000000",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000000",
      "esPrincipal": false,
      "orden": 1,              // ← ERA 0, AHORA 1 (se movió al segundo)
      "descripcion": "pack-bebidas-frente.jpg"
    },
    {
      "id": "img-1702318000002",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000002",
      "esPrincipal": false,
      "orden": 2,              // ← SIN CAMBIOS
      "descripcion": "pack-bebidas-arriba.jpg"
    }
  ]
}
```

---

## 6️⃣ ELIMINAR UNA IMAGEN (EDIT)

Simplemente la quitas del array:

```json
{
  // ... resto del artículo ...
  "imagenes": [
    {
      "id": "img-1702318000000",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000000",
      "esPrincipal": true,
      "orden": 0,
      "descripcion": "pack-bebidas-frente.jpg"
    },
    {
      "id": "img-1702318000002",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000002",
      "esPrincipal": false,
      "orden": 1,
      "descripcion": "pack-bebidas-arriba.jpg"
    }
    // ← img-1702318000001 ELIMINADA (fue la imagen 2)
  ]
}
```

Después se borra también de Storage en la carpeta del artículo.

---

## 7️⃣ ESTRUCTURA COMPLETA DE SUPABASE RESPONSE

Cuando guardas, Supabase retorna:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-12-11T14:00:00Z",
  "updated_at": "2024-12-11T14:05:30Z",
  "nombre": "Coca Cola Zero 330ml",
  "tipo_articulo": "micecatering",
  "categoria": "Bebidas",
  "precio_venta": 2.50,
  "precio_alquiler": 0,
  "stock": 100,
  "unidad": "Unidad",
  "imagenes": [
    {
      "id": "img-1702318000000",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000000",
      "esPrincipal": true,
      "orden": 0,
      "descripcion": "coca-cola-botella.jpg"
    }
  ]
}
```

---

## 📊 TABLA DE COMPARACIÓN

| Acción | imagenes[] | Cambios |
|--------|-----------|---------|
| Crear sin imágenes | `[]` | - |
| Crear con 1 imagen | `[{...}]` | Nuevo elemento |
| Añadir 2ª imagen | `[{...}, {...}]` | +1 elemento |
| Cambiar principal | `[{esPrincipal:true}, {esPrincipal:false}]` | esPrincipal se invierte |
| Reordenar | `[{orden:0}, {orden:1}]` → `[{orden:1}, {orden:0}]` | orden cambia |
| Eliminar imagen | `[{...}, {...}, {...}]` → `[{...}, {...}]` | -1 elemento |
| Subir a 5 imágenes | `[{...}, {...}, {...}, {...}, {...}]` | 5 elementos MAX |

---

## 🔒 SEGURIDAD - URL PÚBLICA

Las URLs de Storage son **públicas** por diseño:

```
https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/[ARTICLE_ID]/[IMAGE_ID]
```

- ✅ Cualquiera puede VER la imagen (lectura)
- ❌ Nadie puede EDITAR (protegido por Supabase)
- ❌ Solo admin puede ELIMINAR (RLS policy)

---

## 💾 QUERIES SQL EQUIVALENTES

Si quisieras hacer esto directamente en SQL:

### Crear artículo con imagen:
```sql
INSERT INTO public.articulos (
  nombre, 
  tipo_articulo, 
  categoria, 
  precio_venta, 
  imagenes
)
VALUES (
  'Coca Cola Zero 330ml',
  'micecatering',
  'Bebidas',
  2.50,
  '[
    {
      "id": "img-1702318000000",
      "url": "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000000",
      "esPrincipal": true,
      "orden": 0,
      "descripcion": "coca-cola-botella.jpg"
    }
  ]'::jsonb
);
```

### Actualizar imagen principal:
```sql
UPDATE public.articulos
SET imagenes = jsonb_set(
  imagenes,
  '{0, esPrincipal}',
  'false'::jsonb
)
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### Obtener primera imagen de artículo:
```sql
SELECT imagenes -> 0 AS primera_imagen
FROM public.articulos
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## 🧪 TESTING - CURL EXAMPLES

Si quisieras probar con curl:

### Create:
```bash
curl -X POST https://[PROJECT].supabase.co/rest/v1/articulos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "nombre": "Test",
    "tipo_articulo": "micecatering",
    "imagenes": [{
      "id": "img-test",
      "url": "https://...",
      "esPrincipal": true,
      "orden": 0,
      "descripcion": "test.jpg"
    }]
  }'
```

### Update:
```bash
curl -X PATCH https://[PROJECT].supabase.co/rest/v1/articulos?id=eq.[ID] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "imagenes": [...]
  }'
```

---

## 📝 LOGS ESPERADOS EN CONSOLA

Cuando guardas, verás:

```
[FORM] Guardando artículo...
[FORM] Nombre: "Coca Cola Zero 330ml"
[FORM] Imagenes: 1 archivo(s)

[SUPABASE] insertData: {
  nombre: "Coca Cola Zero 330ml",
  tipo_articulo: "micecatering",
  imagenes: [{
    id: "img-1702318000000",
    url: "https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/550e8400-e29b-41d4-a716-446655440000/img-1702318000000",
    esPrincipal: true,
    orden: 0,
    descripcion: "coca-cola-botella.jpg"
  }]
}

[PERF] Query completada en 245.32ms

[SUCCESS] Artículo guardado: 550e8400-e29b-41d4-a716-446655440000
```

---

## ✅ VALIDACIÓN

Cuando la imagen se completa:
1. ✅ Archivo se sube a Storage (bucket articulosMice)
2. ✅ URL se genera automáticamente
3. ✅ JSON se serializa a la BD
4. ✅ Puedes query la imagen desde `articulos.imagenes[0]`
5. ✅ La imagen se visualiza inmediatamente en el navegador

---

## 🚀 PERFORMANCE NOTES

- Imágenes se comprimen automáticamente por ImageManager
- Máximo 5 imágenes = máximo ~1-2MB de datos JSON
- JSONB + GIN index = búsquedas rápidas
- URL es pública, sin limitaciones de acceso

---

**Versión:** 1.0  
**Última actualización:** 2024-12-11  
**Ejemplos testeados:** ✅ Sí
