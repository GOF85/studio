# 🚀 Quick Start: Página Diferencias de Escandallo

## Ubicación
```
/app/(dashboard)/book/analitica/diferencias-escandallo/page.tsx
```

## Acceso Inmediato
```
http://localhost:3000/dashboard/book/analitica/diferencias-escandallo
```

## Estructura de Archivos

### 📄 Página Principal
```
page.tsx (315 líneas)
├── URL-driven state (tab, dateFrom, dateTo, q, filterVar, minPercent)
├── Hook: useEscandalloAnalytics (fetch + cálculos)
├── SummaryCards (4 KPI cards)
├── EvolutionChart (AreaChart recharts)
├── Tabs (ingredientes, elaboraciones, recetas)
├── FiltersBar (búsqueda, tipo, mín %)
└── ComparisonTable (tabla principal + expandibles)
```

### 🎨 Componentes (7 + 1 página)
```
components/book/analitica/
├── alert-badge.tsx          → Badge de alerta (✓ OK | ⚠️ VIGILAR | 🚨 REVISAR)
├── comparison-table.tsx      → Tabla 7 columnas con sparklines
├── evolution-chart.tsx       → Gráfico AreaChart con tendencias
├── filters-bar.tsx          → Filtros: búsqueda, tipo, slider %
├── row-expanded.tsx         → Desglose de componentes
├── sparkline.tsx            → Mini gráficos SVG (30 días)
├── summary-cards.tsx        → 4 KPI cards
└── index.ts                 → Exportaciones
```

### 🪝 Hook
```
hooks/use-escandallo-analytics.ts (145 líneas)
├── Fetch ingredientes/elaboraciones/recetas
├── Cálculo de variaciones (diff, %)
├── Generación de snapshots (diarios)
└── Manejo de errores
```

### 🔧 Helpers
```
lib/escandallo-helpers.ts (125 líneas)
├── getVariationAlert(%)           → Colores y badges
├── getChartColor(%)               → Color para gráfico
├── getSparklineData()             → Últimos 30 puntos
├── calculateTrend()               → up/down/stable
├── getSparklineColor()            → Color según tendencia
├── generateSparklinePoints()      → Puntos SVG
├── isValidDateRange()             → Validación
└── calculateSummaryStats()        → Stats para KPI
```

## 🎯 Flujo de Usuario

```
1. Abre página
   ↓
2. Ve rango de fechas (default: últimos 30 días)
   ↓
3. Elige pestaña (Ingredientes/Elaboraciones/Recetas)
   ↓
4. Ve:
   - 4 KPI cards (total, promedio, máximo aumento, máximo descenso)
   - Gráfico de evolución (AreaChart)
   - Tabla con:
     * Nombre (searchable)
     * Coste inicial/final
     * Variación € y %
     * Sparkline (30 días)
     * Botón expandir
   ↓
5. Puede:
   - Buscar por nombre
   - Filtrar por tipo (todos, aumentos, reducciones)
   - Filtrar por mínimo %
   - Ordenar por cualquier columna
   - Expandir para ver desglose
   - Exportar a CSV
```

## 🎨 Sistema de Colores

| % Variación | Color | Badge | Uso |
|-------------|-------|-------|-----|
| < -5% | Verde | ✓ OK | Reducción buena |
| -5% a +5% | Gris/Amarillo | - | Estable/Atención |
| +5% a +10% | Ámbar | ⚠️ VIGILAR | Alerta moderada |
| > +10% | Rojo | 🚨 REVISAR | Alerta crítica |

## 📊 Tabla: 7 Columnas

1. **Nombre** - Searchable, sorteable, with ID below
2. **Coste Inicial** - EUR, right-aligned, sorteable
3. **Coste Final** - EUR, right-aligned, sorteable
4. **Var. €** - EUR, colored, sorteable
5. **Var. %** - %, colored, badge, tooltip if >10%, sorteable
6. **Tendencia** - Sparkline SVG (30d), color = trend
7. **Expandir** - ChevronDown animated

## 🎮 Interacciones Clave

### URL State
```js
// Actualiza URL al cambiar algo (sin reload)
const updateUrl = (params) => {
  const current = new URLSearchParams(searchParams);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null) current.delete(key);
    else current.set(key, value);
  });
  router.push(`?${current.toString()}`, { scroll: false });
};
```

### Cambiar Tab
```js
// Actualiza URL + scroll top
const handleTabChange = (newTab) => {
  updateUrl({ tab: newTab });
  window.scrollTo({ top: 0, behavior: 'instant' });
};
```

### Expandir Fila
```js
// Toggle expandida, muestra desglose inline
const handleExpand = (itemId) => {
  setExpandedId(expandedId === itemId ? null : itemId);
};
```

## 🧪 Testing Quick Checklist

- [ ] No hay errores TypeScript `npm run build`
- [ ] Página carga sin errores
- [ ] URL contiene parámetros correctos
- [ ] Cambiar tab → scroll top
- [ ] Búsqueda filtra tabla
- [ ] Filtros se aplican
- [ ] Ordenamiento funciona (↑↓)
- [ ] Expandible muestra desglose
- [ ] Sparklines son visibles
- [ ] Gráfico carga
- [ ] Tooltip aparece si % > 10%
- [ ] CSV export funciona
- [ ] Mobile responsive

## 🚀 Deployment

1. Asegúrate que Supabase está configurado
2. `npm run build` (verifica que no hay errores)
3. `npm run start` (production build)
4. Accede a `/dashboard/book/analitica/diferencias-escandallo`

## ⚠️ Notas Importantes

1. **Hook Mock Data:** Usa `Math.random()` para demo. En producción, conectar con `historico_precios_erp`.

2. **Tabla en Supabase:**
   - `ingredientes_internos` (id, nombreIngrediente)
   - `elaboraciones` (id, nombre, componentes)
   - `recetas` (id, nombre, elaboraciones)
   - `historico_precios_erp` (articuloErpId, fecha, precioCalculado)

3. **Performance:**
   - Memos en filtrado/ordenamiento
   - Lazy load recharts
   - SVG sparklines (no imagen)

4. **Accesibilidad:**
   - Labels en inputs
   - aria-labels en iconos
   - Semántica HTML

## 🔗 Links Útiles

- **Documentación completa:** `/docs/analitica-diferencias-escandallo.md`
- **Sumario ejecutivo:** `/ANALITICA_ESCANDALLO_README.md`
- **style.md:** Referencia de estilos del proyecto
- **Componentes shadcn:** Card, Tabs, Table, Button, Badge, Input, Label

## 💡 Tips de Desarrollo

### Agregar nuevo filtro
```tsx
// 1. Agregar a URL state
const nuevoFiltro = searchParams.get('filtroNuevo') || 'default';

// 2. Pasar a tabla
<ComparisonTable ... nuevoFiltro={nuevoFiltro} />

// 3. Aplicar en useMemo
const filteredData = useMemo(() => {
  let filtered = data;
  if (nuevoFiltro !== 'default') {
    filtered = filtered.filter(item => item.propiedad === nuevoFiltro);
  }
  return filtered;
}, [data, nuevoFiltro]);
```

### Agregar nueva columna
```tsx
// 1. En ComparisonTable, agregar TableHead
<TableHead className="cursor-pointer" onClick={() => handleSort('newColumn')}>
  Nueva Columna
</TableHead>

// 2. Agregar a SortBy type
type SortBy = 'nombre' | 'startPrice' | 'endPrice' | 'diff' | 'percent' | 'newColumn';

// 3. Agregar lógica sort
if (sortBy === 'newColumn') {
  aVal = a.newProp;
  bVal = b.newProp;
}

// 4. En TableCell, mostrar dato
<TableCell>{item.newProp}</TableCell>
```

### Cambiar rango de color
```ts
// En escandallo-helpers.ts, getVariationAlert()
if (percent <= 8) return { ... badge: '⚠️ VIGILAR' ... }; // Antes era 10%
```

## 📞 Debugging

Si algo no funciona:

```js
// Verificar state de URL
console.log('URL params:', searchParams.toString());

// Verificar datos del hook
console.log('Hook data:', data);
console.log('Hook snapshots:', snapshots);

// Verificar filtrado
console.log('Filtered data:', filteredData);

// Verificar stats
console.log('Summary stats:', summaryStats);
```

---

**Estado:** ✅ Completo y Listo para Usar
**Versión:** 1.0
**Última actualización:** Diciembre 2025
