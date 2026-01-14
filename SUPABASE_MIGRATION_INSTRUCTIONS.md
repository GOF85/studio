# 🔧 INSTRUCCIONES: Corregir columnas en Supabase

## Problema encontrado
Las tablas `os_pedidos_pendientes` y `os_pedidos_enviados` tienen un nombre de columna inconsistente:
- En algunos lugares se usa: `localización` (con tilde)
- En otros: `localizacion` (sin tilde)

Esto causa el error: **"Could not find the 'localizacion' column"**

## Solución: Recrear las tablas

### Opción 1: Automático (via script Node.js)

```bash
# Desde la raíz del proyecto
node scripts/run-migration.js
```

### Opción 2: Manual en Supabase Dashboard (RECOMENDADO)

1. **Abre Supabase Dashboard**
   - Ir a: https://supabase.com/dashboard
   - Selecciona el proyecto: `zyrqdqpbrsevuygjrhvk`

2. **Accede al SQL Editor**
   - Click en el ícono "SQL Editor" (izquierda)
   - O: Click en "SQL" en el menú superior

3. **Crea una nueva query**
   - Click en "New query"

4. **Copia el SQL de corrección**
   - Abre el archivo: `migrations/002_fix_column_names.sql`
   - Copia TODO el contenido

5. **Pega y ejecuta**
   - Pega el SQL en el editor
   - Click en el botón azul "RUN" (o Cmd+Enter)

6. **Verifica el resultado**
   - Deberías ver: ✅ Success
   - Las tablas serán recreadas sin datos (empezarán vacías)

## Archivo de corrección

El archivo SQL está en:
```
migrations/002_fix_column_names.sql
```

Contiene:
- ✅ Drop de índices y triggers antiguos
- ✅ Drop de tablas antiguas
- ✅ Recreación de tablas con columna correcta: `localizacion` (sin tilde)
- ✅ Recreación de índices
- ✅ Recreación de triggers
- ✅ Restauración de políticas RLS

## Después de ejecutar

1. **Recarga la aplicación**
   ```bash
   npm run dev
   ```

2. **Prueba crear un pedido**
   - Va a: http://localhost:3000/pedidos-example
   - Intenta crear un nuevo pedido
   - ¡Debería funcionar ahora!

## Cambios de código realizados

Ya hemos corregido el código TypeScript:
- ✅ `types/pedidos.ts` - Cambiado `localización` → `localizacion`
- ✅ `components/pedidos/pending-order-card.tsx`
- ✅ `components/pedidos/pending-orders-list.tsx`
- ✅ `components/pedidos/sent-order-card.tsx`
- ✅ `components/pedidos/modals/change-context-modal.tsx`
- ✅ `components/pedidos/modals/pdf-generation-modal.tsx`
- ✅ `components/pedidos/modals/sent-order-details-modal.tsx`
- ✅ `lib/pedidos-utils.ts`
- ✅ `lib/pdf-generator.ts`
- ✅ `migrations/001_create_pedidos_tables.sql`

Solo falta recrear las tablas en la base de datos.

## Si algo sale mal

Si ves errores como:
```
ERROR: relation "os_pedidos_pendientes" already exists
```

Significa que las tablas ya existen pero con la estructura antigua. El script DROP IF EXISTS debería manejar esto, pero si persiste:

1. Ve a Supabase Dashboard
2. Tabla Manager (izquierda)
3. Busca `os_pedidos_pendientes` y `os_pedidos_enviados`
4. Haz click en el menú (3 puntos)
5. "Delete table" para ambas
6. Luego ejecuta el SQL de corrección

---

**¡Así de simple!** Una vez hecho esto, la aplicación funcionará correctamente.
