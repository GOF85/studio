# Guía: Ejecutar Migración SQL en Supabase

## 🔍 Verificación Previa

Antes de ejecutar la migración, verifica que tu tabla `elaboracion_producciones` existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'elaboracion_producciones' 
ORDER BY ordinal_position;
```

## 📋 SQL a Ejecutar

```sql
-- Migration: Add ratio_produccion column to elaboracion_producciones
-- Description: Store the ratio between actual and planned production

ALTER TABLE elaboracion_producciones
ADD COLUMN IF NOT EXISTS ratio_produccion DECIMAL(5, 4) DEFAULT 1.0000;

-- Add comment for clarity
COMMENT ON COLUMN elaboracion_producciones.ratio_produccion IS 'Ratio de producción: cantidad_final_producida / cantidad_planificada. Usado para análisis de rendimiento y ajustes futuros de recetas.';
```

## ✅ Pasos para Ejecutar en Supabase

### 1. Ir al Supabase Dashboard
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

### 4. Verificar Que Funcionó
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'elaboracion_producciones' 
AND column_name = 'ratio_produccion';
```

Deberías ver algo como:
```
column_name         | data_type      | column_default
--------------------|----------------|------------------
ratio_produccion    | numeric        | 1.0000
```

## 🔄 Después de la Migración

El sistema ahora está completamente operacional:

1. ✅ Helper functions creadas (`escandallo-update-helper.ts`)
2. ✅ Dialog component creado (`escandallo-sugerido-dialog.tsx`)
3. ✅ Integración en producciones completada
4. ✅ Base de datos actualizada (con esta migración)

## 🚀 Próximas Acciones

### Testing
1. Ve a una elaboración existente
2. Abre pestaña "Producciones"
3. Registra 2+ producciones con `AñadirProduccionDialog`
4. Deberías ver un banner azul con "Se detectaron X mejora(s)"
5. Click en "Revisar Cambios" para ver el dialog

### Personalización
Si necesitas ajustar parámetros:
- **Cambiar número de producciones analizadas**: En `producciones-tab.tsx` línea ~85, cambiar `5` en `calcularEscandallosSugeridos(elaboracionId, 5)`
- **Cambiar umbral de cambio (0.5%)**: En `escandallo-update-helper.ts` línea ~30, cambiar `0.005`
- **Cambiar decimales mostrados**: En `escandallo-sugerido-dialog.tsx`, buscar `.toFixed(3)` o `.toFixed(4)`

## ⚠️ Troubleshooting

### Error: "relation does not exist"
→ Verifica que `elaboracion_producciones` existe (ver Verificación Previa)

### Error: "column already exists"
→ Normal, el `IF NOT EXISTS` lo previene. Simplemente re-ejecuta.

### Error de RLS
→ Asegúrate que tienes permisos `INSERT` y `UPDATE` en la tabla.

### El dialog no aparece
→ Verifica que hay al menos 2 producciones registradas
→ Abre la consola del navegador (F12) y busca errores

---

**Estado**: Listo para ejecutar
**Archivo de migración**: `/migrations/20251213_add_ratio_produccion_column.sql`
