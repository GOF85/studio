# Fix: Gestión de Imágenes en Espacios

## 🐛 Problema Identificado

Las imágenes se subían correctamente a Supabase Storage pero no se guardaban en la base de datos ni se mostraban en la interfaz.

## ✅ Solución Implementada

### 1. Tipo TypeScript Actualizado
- ✅ Añadida propiedad `categoria?: 'foto' | 'plano'` a `ImagenEspacio`

### 2. Servicio de Espacios Corregido
- ✅ `createEspacio()` ahora guarda imágenes en `espacios_imagenes`
- ✅ `updateEspacio()` ahora actualiza imágenes correctamente
- ✅ Mapper `mapEspacioFromDB()` transforma correctamente snake_case → camelCase

### 3. Schema de Base de Datos
- ✅ Añadida columna `categoria` a tabla `espacios_imagenes`

## 🚀 Migración Requerida

**IMPORTANTE**: Debes ejecutar esta migración SQL en Supabase:

```sql
-- Añadir columna categoria a la tabla espacios_imagenes
ALTER TABLE espacios_imagenes 
ADD COLUMN IF NOT EXISTS categoria TEXT CHECK (categoria IN ('foto', 'plano')) DEFAULT 'foto';
```

### Cómo ejecutar la migración:

1. Ve a tu proyecto en Supabase Dashboard
2. Abre el **SQL Editor**
3. Copia y pega el SQL de arriba
4. Haz clic en **Run**

O usa el archivo: [`migration_add_categoria_imagenes.sql`](file:///Users/guillermo/mc/studio/migration_add_categoria_imagenes.sql)

## 📋 Archivos Modificados

1. **`src/types/espacios.ts`**
   - Añadida propiedad `categoria` a `ImagenEspacio`

2. **`src/services/espacios-service.ts`**
   - Corregido `createEspacio()` para guardar imágenes
   - Corregido `updateEspacio()` para actualizar imágenes
   - Corregido `mapEspacioFromDB()` para mapear imágenes correctamente

3. **`migration_espacios_v2.sql`**
   - Actualizado schema con columna `categoria`

4. **`migration_add_categoria_imagenes.sql`** (NUEVO)
   - Migración para añadir columna a tablas existentes

## ✅ Verificación

Después de ejecutar la migración SQL:

1. **Sube una nueva imagen** en cualquier espacio
2. **Verifica en Supabase**:
   - Storage: debe aparecer en `espacios-images/[espacio-id]/`
   - Database: debe aparecer en tabla `espacios_imagenes`
3. **Recarga la página** del espacio
4. **Las imágenes deben mostrarse** en la galería

## 🔍 Debugging

Si las imágenes aún no se muestran:

1. **Verifica la consola del navegador** por errores
2. **Revisa Supabase Dashboard** → Storage → `espacios-images`
3. **Revisa Supabase Dashboard** → Table Editor → `espacios_imagenes`
4. **Verifica las políticas RLS** de la tabla `espacios_imagenes`

## 📝 Notas Técnicas

### Flujo de Subida de Imágenes:

1. Usuario selecciona imagen → `ImageUploader`
2. Imagen se sube a Supabase Storage → bucket `espacios-images`
3. Se obtiene URL pública
4. Se añade a formulario → `form.setValue('imagenes', ...)`
5. Al guardar espacio → `createEspacio()` o `updateEspacio()`
6. Se insertan registros en tabla `espacios_imagenes`
7. Al cargar espacio → `getEspacioById()` hace JOIN con `espacios_imagenes`
8. Mapper transforma datos DB → TypeScript
9. Componente `ImageGallery` muestra las imágenes

### Estructura de Datos:

```typescript
// En el formulario (TypeScript)
{
  id: "uuid",
  espacioId: "uuid",
  url: "https://...",
  esPrincipal: false,
  descripcion: "foto.jpg",
  orden: 0,
  categoria: "foto"
}

// En la base de datos (SQL)
{
  id: "uuid",
  espacio_id: "uuid",
  url: "https://...",
  es_principal: false,
  descripcion: "foto.jpg",
  orden: 0,
  categoria: "foto"
}
```

## 🎉 Resultado

Ahora las imágenes:
- ✅ Se suben a Storage
- ✅ Se guardan en la base de datos
- ✅ Se muestran en la galería
- ✅ Se pueden reordenar
- ✅ Se pueden marcar como principales
- ✅ Se pueden eliminar
- ✅ Se categorizan como fotos o planos
