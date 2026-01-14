# 🔧 SOLUCIÓN: Añadir columna proveedor_id a os_pedidos_pendientes

## Error encontrado
```
Could not find the 'proveedor_id' column of 'os_pedidos_pendientes' in the schema cache
```

## Causa
La tabla `os_pedidos_pendientes` en Supabase **no tiene la columna `proveedor_id`** que el código intenta usar.

---

## ✅ PASOS PARA ARREGLARLO

### OPCIÓN 1: Hacerlo en Supabase Dashboard (RECOMENDADO - Más rápido)

1. **Abre Supabase:**
   - URL: https://supabase.com/dashboard
   - Proyecto: `zyrqdqpbrsevuygjrhvk`

2. **Ve a SQL Editor:**
   - Haz clic en "SQL Editor" en la barra izquierda

3. **Ejecuta este SQL:**
   ```sql
   -- Add proveedor_id column
   ALTER TABLE os_pedidos_pendientes 
   ADD COLUMN proveedor_id VARCHAR REFERENCES proveedores(id) ON DELETE RESTRICT;

   -- Add index for performance
   CREATE INDEX idx_os_pedidos_pendientes_proveedor_id ON os_pedidos_pendientes(proveedor_id);
   ```

4. **Haz clic en el botón "Run" ▶️**

5. **Verifica el resultado:**
   - Si ves un mensaje verde ✅, ¡listo!
   - Si ves un error 🔴, cópialo y comparte conmigo

---

### OPCIÓN 2: Hacerlo desde la terminal (Si tienes psql instalado)

```bash
# Conectar y ejecutar migración
export PGPASSWORD="tu_password_aquí"
psql -h zyrqdqpbrsevuygjrhvk.supabase.co -U postgres -d postgres -c \
"ALTER TABLE os_pedidos_pendientes ADD COLUMN proveedor_id VARCHAR REFERENCES proveedores(id) ON DELETE RESTRICT;
CREATE INDEX idx_os_pedidos_pendientes_proveedor_id ON os_pedidos_pendientes(proveedor_id);"
```

---

## 📝 ¿Qué hace esta migración?

✅ **Añade columna** `proveedor_id` (VARCHAR) a la tabla  
✅ **Crea referencia** a la tabla `proveedores`  
✅ **Añade índice** para mejor rendimiento en búsquedas  
✅ **Permite NULL** para registros existentes (compatibilidad hacia atrás)

---

## 🧪 Verificar que funcionó

Después de ejecutar la migración, prueba esto en el SQL Editor:

```sql
-- Ver estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'os_pedidos_pendientes'
ORDER BY ordinal_position;
```

Deberías ver `proveedor_id | character varying | YES` en la lista.

---

## 🚀 Después de la migración

1. Recarga la app (F5 o Cmd+R)
2. Intenta crear un nuevo pedido de alquiler
3. **¡Debería funcionar ahora! ✅**

---

## 📞 Si hay problemas

- Comparte el mensaje de error exacto que ves en Supabase
- Verifica que estés en el proyecto correcto
- Asegúrate de que la tabla `proveedores` existe
  
Archivo con SQL: `/migrations/20260110_add_proveedor_to_pedidos_EXECUTE_NOW.sql`
