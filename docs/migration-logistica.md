# Migración de Logística y Pedidos

## 📋 Resumen

Se ha ampliado el proceso de migración para incluir los pedidos de logística que faltaban en la primera fase:
- **Transporte** (`transporteOrders`)
- **Decoración** (`decoracionOrders`)
- **Atípicos** (`atipicoOrders`)
- **Material** (`materialOrders`) - *Se agrupan automáticamente por evento y categoría*
- **Hielo** (`hieloOrders`) - *Se agrupan automáticamente por evento*

## 🛠️ Cambios Realizados

1.  **Base de Datos**: Se añadieron columnas `data` (JSONB) a las tablas de pedidos para almacenar campos flexibles que no tenían columna dedicada (ej: `lugarRecogida`, `horaEntrega`, etc.).
2.  **Script de Migración**: Se actualizó `src/lib/migrate-localStorage.ts` para leer estos pedidos de `localStorage` y guardarlos en Supabase.
3.  **Store**: Se actualizó `use-data-store.ts` para leer estos datos desde Supabase en lugar de `localStorage`.

## 🚀 Acción Requerida

Para que los datos de logística aparezcan en la aplicación, **debes ejecutar la migración de nuevo**:

1.  Ve a la página de migración: `/migration` (o `/admin/migration` según tu ruta).
2.  Si ya habías migrado antes, es posible que veas que algunas entidades ya están "Completadas".
3.  El sistema detectará que hay datos en `localStorage` para Transporte, Decoración y Atípicos.
4.  Ejecuta la migración.

## ⚠️ Nota Importante

Si ya habías borrado el `localStorage` después de la primera migración, estos datos de logística se habrán perdido (a menos que tengas un backup).

Si aún tienes los datos en el navegador, la migración los transferirá a Supabase sin duplicar los que ya se hayan migrado (gracias a la lógica `upsert` y `onConflict`).

## 🔍 Verificación

Después de migrar:
1.  Ve a la sección de Logística de un evento.
2.  Verifica que aparecen los pedidos de Transporte, Decoración y Atípicos.
3.  Comprueba que los detalles (horas, lugares, observaciones) son correctos.
