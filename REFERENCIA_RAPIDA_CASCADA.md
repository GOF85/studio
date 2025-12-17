# ⚡ REFERENCIA RÁPIDA: Cascada de Escandallo

**Creado**: 16 Diciembre 2025  
**Status**: Listo para Producción  
**Acceso**: `/book/analitica/costos-dashboard`

---

## 🎯 Quick Start (5 minutos)

### 1. Ejecutar Migraciones SQL

```bash
# En Supabase SQL Editor:

-- Copy-paste 011_create_coste_recetas_historico.sql → Run
-- Copy-paste 012_add_coste_columns_to_recetas.sql → Run
-- Copy-paste 013_create_cascada_sync_functions.sql → Run
```

### 2. Validar Instalación

```sql
-- En Supabase, ejecuta esto:

SELECT * FROM coste_recetas_historico LIMIT 1;  
-- ✓ Sin error (tabla vacía es OK)

SELECT coste_materia_prima_actual FROM recetas LIMIT 1;
-- ✓ Columna existe

SELECT COUNT(*) FROM pg_proc WHERE proname = 'recalc_receta_costos';
-- ✓ Retorna 1
```

### 3. Abrir Dashboard

```
http://localhost:3000/book/analitica/costos-dashboard
```

---

## 📊 Dashboard Overview

| Sección | Descripción |
|---------|-------------|
| **KPIs** | 4 cards: Alertas críticas, margen, coste, total recetas |
| **Alertas** | Cambios > 5% en últimos 7 días, color-coded |
| **Tabla** | Todas las recetas con costos, márgenes, tendencias |

---

## 🔄 Flujo de Sincronización

```
Precio ERP cambia
    ↓
Trigger automático
    ↓
Recalcula recetas afectadas
    ↓
Dashboard se actualiza (30s)
```

---

## 📁 Archivos Principales

```
migrations/
  ├─ 011_create_coste_recetas_historico.sql (BD: tabla + índices)
  ├─ 012_add_coste_columns_to_recetas.sql (BD: caché)
  └─ 013_create_cascada_sync_functions.sql (BD: trigger + funciones)

hooks/
  ├─ use-costos-recetas-dashboard.ts (Data fetching + alertas)
  └─ use-escandallo-analytics-mejorado.ts (Analytics con datos reales)

components/book/analitica/
  └─ costos-recetas-dashboard.tsx (UI completa)

app/(dashboard)/book/analitica/
  └─ costos-dashboard/page.tsx (Página)
```

---

## 🧪 Quick Test

```sql
-- 1. Cambiar precio
UPDATE articulos_erp 
SET precio_calculado = precio_calculado * 1.15 
WHERE erp_id = 'ABC123' LIMIT 1;

-- 2. Verificar trigger
SELECT COUNT(*) FROM coste_recetas_historico 
WHERE DATE(fecha) = CURRENT_DATE;
-- ✓ Debería tener registros nuevos

-- 3. Ir al dashboard
-- ✓ Debería mostrar cambios
```

---

## 🚨 Alert Levels

| Cambio | Color | Severidad |
|--------|-------|-----------|
| > 15% | 🔴 Rojo | CRÍTICO |
| 10-15% | 🟠 Naranja | ALTO |
| 5-10% | 🟡 Amarillo | MEDIO |
| < 5% | ⚪ Gris | Sin alerta |

---

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| SQL error en migración | Verificar sintaxis, ejecutar de nuevo |
| Trigger no se dispara | `ALTER TABLE articulos_erp ENABLE TRIGGER articulos_erp_precio_change` |
| Dashboard muestra error | F12 > Console, revisar logs de Supabase |
| Lentitud | `ANALYZE coste_recetas_historico` en Supabase |

---

## 📚 Documentación Completa

- **IMPLEMENTACION_CASCADA_ESCANDALLO.md** - Técnica detallada
- **GUIA_EJECUCION_CASCADA.md** - Step-by-step completo

---

## 💡 Funciones Clave

```typescript
// Hook del dashboard
useCostosRecetasDashboard(autoRefreshMs)
// Retorna: recetas[], alertas[], isLoading, error, stats

// Hook mejorado de analytics
useEscandalloAnalyticsNew(type, dateFrom, dateTo)
// Retorna: data[], snapshots[], isLoading, error
```

---

## 🎯 Propósito

✅ Sincronización automática de costos cuando cambian precios  
✅ Dashboard de cocina con alertas en tiempo real  
✅ Historial persistente de cambios  
✅ Márgenes siempre actualizados  

---

**Fecha**: 16 Dic 2025 | **Status**: ✅ Producción | **Setup**: ~15 min
