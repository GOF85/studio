# 🚨 URGENTE: Migración SQL Requerida

## Error Actual
```
Could not find the 'cantidad_planificada' column of 'elaboracion_producciones'
```

## Causa
La tabla `elaboracion_producciones` en Supabase **está faltando columnas críticas**:
- ❌ `cantidad_real_producida` (no existe)
- ❌ `ratio_produccion` (no existe)

## Solución: Ejecutar Esta Migración SQL

**URGENTE**: Ejecuta esto en Supabase SQL Editor AHORA:

```sql
ALTER TABLE elaboracion_producciones
ADD COLUMN IF NOT EXISTS cantidad_real_producida DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS ratio_produccion DECIMAL(5, 4) DEFAULT 1.0000;

COMMENT ON COLUMN elaboracion_producciones.cantidad_real_producida IS 'Cantidad final producida después del proceso';
COMMENT ON COLUMN elaboracion_producciones.ratio_produccion IS 'Ratio entre cantidad_real_producida / cantidad planificada total';
```

## Pasos para Ejecutar

### 1. Ir a Supabase Dashboard
- Abre https://app.supabase.com
- Selecciona tu proyecto
- Ve a **SQL Editor** (lado izquierdo)

### 2. Crear Nueva Query
- Click en **+ New query**
- Copia el SQL anterior
- Pega en el editor

### 3. Ejecutar
- Click en botón verde **"Run"** o presiona `Cmd+Enter`
- Deberías ver: `✓ Success. No rows returned.`

### 4. Verificar que Funcionó
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'elaboracion_producciones' 
ORDER BY ordinal_position;
```

Deberías ver en los resultados:
```
column_name               | data_type
--------------------------|----------
id                        | uuid
elaboracion_id           | uuid
fecha_produccion         | timestamp
responsable              | text
cantidad_real_producida  | numeric    ← ✓ NUEVO
ratio_produccion         | numeric    ← ✓ NUEVO
componentes_utilizados   | jsonb
observaciones            | text
created_at              | timestamp
updated_at              | timestamp
```

## Después de Ejecutar la Migración

1. ✅ El error desaparecerá
2. ✅ Podrás guardar producciones
3. ✅ Los decimales funcionarán correctamente
4. ✅ Sistema listo para usar

## Archivo de Migración
- Ubicación: `/migrations/20250115_add_missing_columns_to_elaboracion_producciones.sql`

---

⚠️ **IMPORTANTE**: Esta migración es obligatoria para que el sistema funcione.
