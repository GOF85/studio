# 🚀 Instrucciones Ejecutar Migración - Badges de Estado

## Paso 1: Copiar SQL

```sql
-- Migración: Agregar campo status a sub_pedidos
-- Ejecutar en: Supabase SQL Editor
-- Fecha: 2026-01-11

ALTER TABLE os_material_orders
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
CHECK (status IN ('pending', 'review', 'confirmed', 'sent', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_material_orders_status ON os_material_orders(status);
```

## Paso 2: Acceder a Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. En el sidebar, haz clic en **SQL Editor**

## Paso 3: Ejecutar

1. Abre una pestaña nueva en SQL Editor
2. Copia el SQL de arriba
3. Pega en el editor
4. Haz clic en **RUN** (botón azul arriba a la derecha)

## Paso 4: Verificar

Deberías ver:
```
✅ Query executed successfully
```

Si ves error `column "status" of relation "os_material_orders" already exists`, significa que ya existe y está todo bien.

## Paso 5: Reload en Navegador

```bash
# En tu navegador, presiona:
Cmd+Shift+R  (Mac)
Ctrl+Shift+R (Windows/Linux)
```

## Paso 6: Prueba en /alquiler

1. Navega a `/alquiler` en tu app
2. Deberías ver badges azules con "🔵 PENDIENTE" en cada sub-pedido

## ✅ Listo!

La migración está completa. Los badges de estado ahora funcionan.

---

**Nota:** Si necesitas cambiar manualmente el estado de un pedido para probar otros colores, puedes ejecutar:

```sql
-- Cambiar un pedido a "review" (ámbar)
UPDATE os_material_orders SET status = 'review' WHERE id = 'YOUR_PEDIDO_ID';

-- Cambiar a "confirmed" (verde)
UPDATE os_material_orders SET status = 'confirmed' WHERE id = 'YOUR_PEDIDO_ID';

-- Cambiar a "sent" (gris)
UPDATE os_material_orders SET status = 'sent' WHERE id = 'YOUR_PEDIDO_ID';

-- Cambiar a "cancelled" (rojo)
UPDATE os_material_orders SET status = 'cancelled' WHERE id = 'YOUR_PEDIDO_ID';
```

Esto es solo para testing. Eventualmente tendremos UI para cambiar el estado.
