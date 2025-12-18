# ⚠️ MIGRACIÓN REQUERIDA - Columnas de Revisión

**Error Encontrado:** `Could not find the 'responsable_revision' column of 'elaboraciones' in the schema cache`

**Causa:** Las columnas para el sistema de revisión no existen en la tabla `elaboraciones` de Supabase.

---

## ✅ Solución: Ejecutar Migración SQL

### Paso 1: Acceder a Supabase Console
1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Haz click en "New Query"

### Paso 2: Copiar y Ejecutar SQL

Copia este SQL y pégalo en el editor:

```sql
-- Agregar columnas de revisión a tabla elaboraciones
ALTER TABLE elaboraciones
ADD COLUMN IF NOT EXISTS requiere_revision BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS comentario_revision TEXT,
ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responsable_revision TEXT;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_elaboraciones_requiere_revision ON elaboraciones(requiere_revision);
CREATE INDEX IF NOT EXISTS idx_elaboraciones_responsable_revision ON elaboraciones(responsable_revision);

-- Comentarios de documentación
COMMENT ON COLUMN elaboraciones.requiere_revision IS 'Indica si la elaboración requiere revisión';
COMMENT ON COLUMN elaboraciones.comentario_revision IS 'Comentarios sobre qué requiere revisión';
COMMENT ON COLUMN elaboraciones.fecha_revision IS 'Fecha/hora cuando se marcó para revisión';
COMMENT ON COLUMN elaboraciones.responsable_revision IS 'Email del usuario responsable de marcar para revisión';
```

### Paso 3: Ejecutar
1. Haz click en "Run"
2. Espera a que se complete
3. Verifica que no haya errores

### Paso 4: Actualizar Supabase Schema Cache
En el Supabase console, ve a "Database" → "elaboraciones" y verifica que las nuevas columnas aparezcan listadas.

Si es necesario, puedes forzar actualización en Supabase haciendo click en el icono de actualización.

---

## 🔍 Verificación

Después de ejecutar, verifica que las columnas existan:

```sql
-- Ver estructura de tabla
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'elaboraciones' 
ORDER BY column_name;
```

Deberías ver estas columnas nuevas:
- ✓ `requiere_revision` (boolean, DEFAULT false)
- ✓ `comentario_revision` (text, nullable)
- ✓ `fecha_revision` (timestamp with time zone, nullable)
- ✓ `responsable_revision` (text, nullable)

---

## 📋 Columnas Agregadas

### requiere_revision
- **Tipo:** BOOLEAN
- **Default:** false
- **Propósito:** Marcar si la elaboración necesita revisión

### comentario_revision
- **Tipo:** TEXT
- **Nullable:** Sí
- **Propósito:** Notas sobre qué revisar

### fecha_revision
- **Tipo:** TIMESTAMP WITH TIME ZONE
- **Nullable:** Sí
- **Propósito:** Cuándo se marcó para revisión (auto-capturado)

### responsable_revision
- **Tipo:** TEXT
- **Nullable:** Sí
- **Propósito:** Email de quién marcó (auto-capturado)

---

## 🔙 Después de la Migración

1. **Recarga la app** (Ctrl+R o Cmd+R)
2. **Intenta guardar una elaboración nuevamente**
3. **Debería funcionar sin errores** ✅

---

## ⚠️ Alternativa: Si no tienes acceso a SQL Editor

Si Supabase no te permite ejecutar SQL directamente:

1. Ve a "Database" → "Tables" → "elaboraciones"
2. Haz click en "+" para agregar columna
3. Agrega manualmente:
   - `requiere_revision` (type: boolean, default: false)
   - `comentario_revision` (type: text)
   - `fecha_revision` (type: timestamp)
   - `responsable_revision` (type: text)

---

## 📝 Rollback (Si es necesario)

Si necesitas deshacer los cambios:

```sql
-- Eliminar columnas (CUIDADO: esto borra datos!)
ALTER TABLE elaboraciones
DROP COLUMN IF EXISTS requiere_revision CASCADE,
DROP COLUMN IF EXISTS comentario_revision CASCADE,
DROP COLUMN IF EXISTS fecha_revision CASCADE,
DROP COLUMN IF EXISTS responsable_revision CASCADE;

-- Eliminar índices
DROP INDEX IF EXISTS idx_elaboraciones_requiere_revision;
DROP INDEX IF EXISTS idx_elaboraciones_responsable_revision;
```

---

## ✅ Checklist

- [ ] Accedí a Supabase console
- [ ] Ejecuté el SQL en SQL Editor
- [ ] No hay errores
- [ ] Las columnas aparecen en la tabla
- [ ] Recargué la app
- [ ] Intento guardar una elaboración → ✅ Funciona

---

**Después de completar esto, el error desaparecerá y la app funcionará correctamente.**
