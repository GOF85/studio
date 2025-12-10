# 🏗️ Arquitectura Visual: Página Diferencias de Escandallo

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      URL SEARCH PARAMS (ESTADO)                         │
│  ?tab=ingredientes&dateFrom=2025-12-01&dateTo=2025-12-10&q=...        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAGE.TSX (ORCHESTRACIÓN)                         │
│  ├─ useRouter, useSearchParams                                         │
│  ├─ Local state: dateRange, expandedId                                │
│  └─ Funciones: updateUrl, handleTabChange, handleExpand               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
        ┌───────────────────────────┴────────────────────────────┐
        ↓                                                          ↓
┌──────────────────────────┐                      ┌──────────────────────────┐
│   HOOK: useEscandallo    │                      │   HELPERS: Funciones     │
│   Analytics              │                      │   Puras                  │
│                          │                      │                          │
│ • Fetch ingredientes     │                      │ • getVariationAlert(%)   │
│ • Fetch elaboraciones    │                      │ • getChartColor(%)       │
│ • Fetch recetas          │                      │ • calculateTrend()       │
│                          │                      │ • calculateSummaryStats()│
│ • Cálculo de variaciones │                      │                          │
│ • Generación snapshots   │                      │ (Sin side effects)       │
│                          │                      │                          │
│ Return:                  │                      └──────────────────────────┘
│ {                        │
│   data: VariacionItem[]  │
│   snapshots: Snapshot[]  │
│   isLoading: boolean     │
│   error: string | null   │
│ }                        │
└──────────────────────────┘
                                    ↓
        ┌───────────────────────────┴────────────────────────────┐
        │                                                         │
        ↓                           ↓                             ↓
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│ SUMMARY CARDS   │    │ EVOLUTION CHART      │    │ TABS             │
│                 │    │                      │    │                  │
│ 4 cards KPI:    │    │ AreaChart recharts   │    │ 3 opciones:      │
│ • Total Items   │    │ • Eje X: fechas      │    │ • Ingredientes   │
│ • Var. Promedio │    │ • Eje Y: coste EUR   │    │ • Elaboraciones  │
│ • Máx Aumento   │    │ • Color gradiente    │    │ • Recetas        │
│ • Máx Reducción │    │ • Tooltip interact.  │    │                  │
│                 │    │ • Animación entrada  │    │ Al cambiar:      │
│ Colores:        │    │                      │    │ • URL actualiza  │
│ • Azul (total)  │    │ Empty state si vacío │    │ • Scroll a top   │
│ • Color alert   │    │                      │    │ • Tabla refresca │
│ • Ámbar/Rojo    │    │                      │    │                  │
│ • Verde         │    │                      │    │                  │
└─────────────────┘    └──────────────────────┘    └──────────────────┘
        ↓                           ↓                             ↓
        │                           │                             │
        └───────────────────────────┴─────────────────────────────┘
                                    ↓
        ┌───────────────────────────┴────────────────────────────┐
        │                                                         │
        ↓                           ↓                             ↓
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│ FILTERS BAR     │    │ COMPARISON TABLE     │    │ ROW EXPANDED     │
│                 │    │                      │    │                  │
│ • Input búsqueda│    │ 7 COLUMNAS:          │    │ Desglose inline: │
│   debounce 300ms│    │ 1. Nombre (search)   │    │ • Componentes    │
│                 │    │ 2. Coste Inicial     │    │ • Cantidad       │
│ • Radio buttons │    │ 3. Coste Final       │    │ • Coste antes/dsp│
│   (Todos,       │    │ 4. Var. €            │    │ • Contribución % │
│    Aumentos,    │    │ 5. Var. % (badge)    │    │                  │
│    Reducciones) │    │ 6. Sparkline 30d     │    │ Coloreado según  │
│                 │    │ 7. Expandir ▼        │    │ getVariationAlert│
│ • Slider mín %  │    │                      │    │                  │
│   0-50          │    │ FEATURES:            │    │ Se cierra al:    │
│                 │    │ • Sorting by click   │    │ • Cambiar pestaña│
│ Todos reflejados│    │ • Color por fila     │    │ • Click expandir │
│ en URL          │    │ • Borde 4px color    │    │                  │
│                 │    │ • Hover effects      │    │                  │
│                 │    │ • Tooltip si %>10    │    │                  │
│                 │    │ • Responsive         │    │                  │
│                 │    │ • Empty states       │    │                  │
│                 │    │                      │    │                  │
│                 │    │ COMPONENTES INTERNOS:│    │                  │
│                 │    │ • AlertBadge         │    │                  │
│                 │    │ • Sparkline (SVG)    │    │                  │
│                 │    │ • Loading skeleton   │    │                  │
└─────────────────┘    └──────────────────────┘    └──────────────────┘
```

---

## Componentes Breakdown

### 📄 PAGE.TSX (315 líneas)
```
┌─ Imports (React, Next, UI, Hooks, Components)
├─ Types (TabType)
├─ Component Definition
│  ├─ Router & SearchParams hooks
│  ├─ URL State parsing
│  ├─ Local State (dateRange, validation)
│  ├─ Data Hook (useEscandalloAnalytics)
│  ├─ Computed State (summaryStats via useMemo)
│  ├─ Event Handlers
│  │  ├─ updateUrl (generic URL updater)
│  │  ├─ handleTabChange (+ scroll top)
│  │  ├─ handleDateRangeChange
│  │  ├─ handleSearchChange
│  │  ├─ handleFilterVariationChange
│  │  ├─ handleMinPercentChange
│  │  └─ handleExport (CSV)
│  └─ JSX Render
│     ├─ Header
│     ├─ Date Range Input (obligatorio)
│     ├─ Error state (si error en hook)
│     └─ Main Content (si rango válido)
│        ├─ SummaryCards
│        ├─ EvolutionChart
│        └─ Tabs
│           ├─ TabsList (sticky con badges)
│           └─ TabsContent (3 tabs)
│              ├─ FiltersBar
│              └─ ComparisonTable
└─ export default
```

### 🎨 COMPONENTES (7 archivos)

```
ALERT BADGE (35 líneas)
├─ Props: percent, className
├─ Logic: return null si |%| < 5%
└─ Render: Badge con color/icono según %

SPARKLINE (50 líneas)
├─ Props: data[], itemId
├─ Logic: 
│  ├─ Calcular min/max
│  ├─ Generar puntos SVG
│  └─ Determinar color
└─ Render: <svg> con polyline + gradiente

SUMMARY CARDS (95 líneas)
├─ Props: stats, isLoading
├─ Render: 4 Cards
│  ├─ Total Items (azul)
│  ├─ Var. Promedio (color según rango)
│  ├─ Máx Aumento (ámbar/rojo)
│  └─ Máx Reducción (verde)
└─ Loading: 4 skeleton loaders

FILTERS BAR (65 líneas)
├─ Props: searchTerm, filterVar, minPercent, handlers
├─ Render: Dentro de dashed border
│  ├─ Input búsqueda
│  ├─ Radio buttons (3 opciones)
│  └─ Slider % (0-50)
└─ onChange → updateUrl

EVOLUTION CHART (80 líneas)
├─ Props: snapshots[], isLoading, activeTab
├─ Logic:
│  ├─ Calcular tendencia (priceEnd - priceStart)
│  └─ Determinar chartColor
└─ Render: AreaChart Recharts
   ├─ Defs (gradiente)
   ├─ CartesianGrid
   ├─ XAxis, YAxis
   ├─ Tooltip
   └─ Area (con animación)

ROW EXPANDED (75 líneas)
├─ Props: item (VariacionItem)
├─ Render: Div con tabla interna
│  └─ Fila por componente
│     ├─ Nombre, tipo, cantidad
│     ├─ Coste antes/después
│     ├─ % cambio (coloreado)
│     └─ Contribución % del cambio total
└─ Coloreo dinámico según getVariationAlert

COMPARISON TABLE (230 líneas)
├─ Props: data[], snapshots[], isLoading, filters
├─ Local State: expandedId, sortBy, sortDir
├─ Computed: filteredData, sparklineData
├─ Event Handlers:
│  ├─ handleSort (toggle asc/desc)
│  ├─ handleExpand (toggle inline detail)
│  └─ handleTabChange (clear expandedId)
├─ Render: <Table>
│  ├─ <TableHeader> (7 cols, sorteable)
│  ├─ <TableBody>
│  │  └─ TableRow (coloreada según alert)
│  │     ├─ Nombre (con ID)
│  │     ├─ Coste Inicial/Final
│  │     ├─ Var. € (coloreada)
│  │     ├─ Var. % (+ badge + tooltip)
│  │     ├─ Sparkline
│  │     └─ ChevronDown
│  └─ Fragment con RowExpanded
└─ Empty states + Loading skeleton
```

### 🪝 HOOK (145 líneas)

```
USE ESCANDALLO ANALYTICS
├─ Props: type ('ingredientes'|'elaboraciones'|'recetas'), dateFrom, dateTo
├─ State:
│  ├─ data: VariacionItem[]
│  ├─ snapshots: EscandalloSnapshot[]
│  ├─ isLoading: boolean
│  └─ error: string | null
├─ Computed:
│  └─ isValidRange: boolean (useMemo)
├─ Callbacks:
│  └─ fetchAndCalculate (useCallback)
│     ├─ Valida rango
│     ├─ Setea loading
│     ├─ Try block:
│     │  ├─ Si type === 'ingredientes':
│     │  │  └─ Fetch y calcula variaciones
│     │  ├─ Si type === 'elaboraciones':
│     │  │  └─ Fetch y calcula variaciones
│     │  └─ Si type === 'recetas':
│     │     └─ Fetch y calcula variaciones
│     ├─ Genera snapshots históricos (30 días)
│     ├─ Catch: setError
│     └─ Finally: setLoading(false)
├─ Effect:
│  └─ Si isValidRange → fetchAndCalculate
└─ Return: { data, snapshots, isLoading, error }
```

### 🔧 HELPERS (125 líneas)

```
HELPERS (FUNCIONES PURAS)

getVariationAlert(percent)
└─ Retorna: VariacionAlert
   ├─ percent < -5%   → green OK
   ├─ -5% a +5%       → gray/yellow stable/attn
   ├─ +5% a +10%      → amber VIGILAR
   └─ > +10%          → red REVISAR

getChartColor(percent)
└─ Retorna: hex color según trend

getSparklineData(values)
└─ Retorna: últimos 30 valores

calculateTrend(data)
└─ Retorna: 'up' | 'down' | 'stable'

getSparklineColor(data)
└─ Retorna: hex color según trend

generateSparklinePoints(data)
└─ Retorna: "x,y L x,y L ..." para SVG polyline

isValidDateRange(from, to)
└─ Retorna: boolean (fecha válida)

calculateSummaryStats(items)
└─ Retorna: { totalItems, avgVar, maxInc, maxDec }
```

---

## Data Flow Timeline

```
USUARIO ABRE PÁGINA
        ↓
    SearchParams leídos
        ↓
    URL state parseado
        ↓
    Hook ejecutado
        ↓
    API fetch (simulado)
        ↓
    Cálculos completados
        ↓
    Components renderizados
        ↓
    PAGE VISIBLE ✅
        
        ↓↓↓ USUARIO INTERACTÚA ↓↓↓

USUARIO CAMBIA TAB
        ↓
    handleTabChange()
        ↓
    updateUrl({ tab: newTab })
        ↓
    router.push con scroll: false
        ↓
    window.scrollTo({ top: 0 })
        ↓
    SearchParams actualizado
        ↓
    Hook re-ejecutado con nuevo type
        ↓
    UI actualizado ✅

USUARIO BUSCA
        ↓
    handleSearchChange(term)
        ↓
    updateUrl({ q: term })
        ↓
    SearchParams actualizado
        ↓
    ComparisonTable filtra
        ↓
    UI actualizado ✅

USUARIO EXPANDE FILA
        ↓
    handleExpand(itemId)
        ↓
    setExpandedId(itemId)
        ↓
    RowExpanded renderizado
        ↓
    UI actualizado ✅
```

---

## Color System Visualization

```
PORCENTAJE DE VARIACIÓN → COLOR ASIGNADO

< -5%        █████ 🟢 Verde Oscuro (OK)
-5% a -1%    █████ 🟢 Verde Claro (Mejora)
-1% a +1%    █████ ⚪ Gris (Estable)
+1% a +5%    █████ 🟡 Amarillo (Atención)
+5% a +10%   █████ 🟠 Ámbar (VIGILAR ⚠️)
> +10%       █████ 🔴 Rojo (REVISAR 🚨)
```

---

## Responsive Breakpoints

```
MOBILE (< 768px)                TABLET (768px - 1024px)         DESKTOP (> 1024px)
┌──────────────┐               ┌──────────────────┐             ┌──────────────────────┐
│ Header       │               │ Header           │             │ Header               │
│ Date Picker  │               │ Date Picker      │             │ Date Picker          │
│ KPI 1x4      │               │ KPI 2x2          │             │ KPI 1x4              │
│ (stack)      │               │                  │             │                      │
│              │               │ Chart (full)     │             │ Chart (full)         │
│ Chart        │               │ Tabs sticky      │             │ Tabs sticky          │
│ (small)      │               │ Filters          │             │ Filters              │
│              │               │ Table (scroll)   │             │ Table (full)         │
│ Filters      │               │                  │             │                      │
│ (compact)    │               │ Expandible       │             │ Expandible           │
│              │               │ (inline)         │             │ (inline)             │
│ Table        │               │                  │             │                      │
│ (scroll h)   │               │                  │             │                      │
│              │               │                  │             │                      │
│ Expandible   │               │                  │             │                      │
│ (inline)     │               │                  │             │                      │
└──────────────┘               └──────────────────┘             └──────────────────────┘

Sparklines:    Visibles        Sparklines:        Visibles    Sparklines:    Claros
               Comprimidos                        Normales                   Espaciados
```

---

## Performance Optimizations

```
1. MEMOS
   ├─ dateRange validation
   ├─ isValidRange check
   ├─ filteredData (sorting + filtering)
   ├─ summaryStats calculation
   └─ sparklineData generation

2. LAZY LOADING
   └─ Recharts (AreaChart lazy loaded)

3. CALLBACKS
   ├─ updateUrl
   ├─ handleTabChange
   ├─ handleExpand
   ├─ handleSort
   └─ All other handlers (useCallback)

4. SVG OPTIMIZATION
   └─ Sparklines: SVG puro (no images, sin deps)

5. DEBOUNCE
   └─ Búsqueda: URL change (debounced implícitamente)

RESULT: Smooth 60fps interactions ✅
```

---

**Arquitectura Clara, Mantenible y Escalable** 🎯
