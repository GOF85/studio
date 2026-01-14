# ⚠️ URGENTE: Ejecutar migración en Supabase

## Problema
La tabla `os_pedidos_pendientes` no tiene la columna `proveedor_id` en la base de datos Supabase.

**Error en consola:**
```
"Could not find the 'proveedor_id' column of 'os_pedidos_pendientes' in the schema cache"
```

## Solución: Ejecutar SQL en Supabase

### Pasos:
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y pega este SQL:

```sql
-- Add proveedor_id column
ALTER TABLE os_pedidos_pendientes 
ADD COLUMN proveedor_id VARCHAR REFERENCES proveedores(id) ON DELETE RESTRICT;

-- Add index for performance
CREATE INDEX idx_os_pedidos_pendientes_proveedor_id ON os_pedidos_pendientes(proveedor_id);
```

5. Haz clic en **Run** ▶️
6. Espera a que se complete
7. Verifica que no haya errores
8. Vuelve a intentar crear un pedido en la app

## ¿Qué hace esta migración?
- ✅ Añade columna `proveedor_id` a la tabla
- ✅ Permite enlazar cada pedido con un proveedor
- ✅ Añade índice para mejor rendimiento
- ✅ Crea referencia a tabla `proveedores`

## Después de ejecutar:
- La app debería poder guardar pedidos con proveedor
- Los pedidos existentes tendrán `proveedor_id = NULL`
- Los nuevos pedidos guardarán el proveedor automáticamente

## Archivo SQL
Ver: `/migrations/20260110_add_proveedor_to_pedidos_EXECUTE_NOW.sql`
