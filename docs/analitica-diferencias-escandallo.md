# Página de Analítica: Diferencias de Escandallo

## 📍 Ubicación
```
/app/(dashboard)/book/analitica/diferencias-escandallo/page.tsx
```

## 🎯 Descripción
Página de analítica que compara costos de escandallo (ingredientes, elaboraciones, recetas) entre dos fechas, mostrando variaciones en EUR y porcentajes.

## 🏗️ Arquitectura

### Estructura de Carpetas
```
components/book/analitica/
├── alert-badge.tsx          # Badge de alerta (REVISAR, VIGILAR, OK)
├── comparison-table.tsx      # Tabla principal con sorting, búsqueda, sparklines
├── evolution-chart.tsx       # Gráfico de evolución con recharts
├── filters-bar.tsx          # Filtros: búsqueda, tipo variación, mín %
├── row-expanded.tsx         # Fila expandida con desglose de componentes
├── sparkline.tsx            # Mini gráfico de 30 días
├── summary-cards.tsx        # 4 cards KPI
└── index.ts                 # Exportaciones centralizadas

hooks/
└── use-escandallo-analytics.ts  # Hook para fetch y cálculo

lib/
└── escandallo-helpers.ts        # Helpers puros (colores, cálculos)

app/(dashboard)/book/analitica/diferencias-escandallo/
└── page.tsx                     # Página principal (URL-driven state)
```

## 🎨 Características Principales

### 1. URL-Driven State
La página mantiene todo el estado en los search params:
- `?tab=ingredientes|elaboraciones|recetas`
- `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- `?q=búsqueda`
- `?filterVar=todos|aumentos|reducciones`
- `?minPercent=0-50`

**Beneficios:**
- Compartible por URL
- Persistencia sin base de datos
- Refresh sin pérdida de estado

### 2. Sistema de Colores
Basado en porcentaje de variación:

| Variación | Color | Estado | Badge |
|-----------|-------|--------|-------|
| < -5% | Verde | Bueno | ✓ OK |
| -5% a -1% | Verde claro | Mejora | - |
| -1% a +1% | Gris | Estable | - |
| +1% a +5% | Amarillo | Atención | - |
| +5% a +10% | Ámbar | **VIGILAR** | ⚠️ |
| > +10% | Rojo | **REVISAR** | 🚨 |

### 3. Tabla Principal
**Columnas:**
1. Nombre (searchable, sorteable)
2. Coste Inicial (sorteable)
3. Coste Final (sorteable)
4. Variación € (sorteable)
5. Variación % (sorteable, con tooltip si > 10%)
6. Sparkline (30 días, color según tendencia)
7. Expandir (ChevronDown animado)

**Características:**
- Coloreo dinámico por fila según alert
- Borde izquierdo 4px coloreado
- Tooltip flotante para % > 10%
- Expandible inline para desglose de componentes
- Responsive (scroll horizontal en mobile)

### 4. Sparklines
Mini gráficos SVG:
- **Ancho:** 60px | **Alto:** 20px
- **Datos:** Últimos 30 valores históricos
- **Color:** Rojo (tendencia al alza), Verde (tendencia a la baja), Gris (estable)
- **Área:** Relleno con gradiente semitransparente

### 5. Gráfico de Evolución
AreaChart mostrando:
- Eje X: Fechas
- Eje Y: Coste promedio
- Color gradiente según tendencia general
- Tooltip interactivo con valores formateados
- Animación al cambiar pestaña

### 6. KPI Cards
4 cards resumidas:
1. **Total Items Afectados** (azul)
2. **Variación Promedio** (color según rango)
3. **Mayor Aumento** (ámbar/rojo)
4. **Mayor Reducción** (verde)

Cada card con:
- Borde izquierdo 4px coloreado
- Número grande + etiqueta
- Skeleton loading mientras carga

### 7. Filtros
FiltersBar con:
- **Búsqueda:** Input debounce 300ms
- **Tipo:** Radio buttons (Todos, Solo Aumentos, Solo Reducciones)
- **Mínimo %:** Slider 0-50%

Todos aplicados en tiempo real a la tabla.

## 📊 Tabs
3 pestañas principales:
- **Ingredientes Internos** (tipo: ingrediente)
- **Elaboraciones** (tipo: elaboracion)
- **Recetas** (tipo: receta)

Al cambiar:
- URL actualiza (`?tab=`)
- Scroll a top (instant)
- Tabla refresca con nuevo tipo
- Gráfico se redraws
- Expandibles se cierran

## ⚙️ Hook: useEscandalloAnalytics

### Firma
```typescript
useEscandalloAnalytics(
  type: 'ingredientes' | 'elaboraciones' | 'recetas',
  dateFrom: string | null,
  dateTo: string | null
): {
  data: VariacionItem[];
  snapshots: EscandalloSnapshot[];
  isLoading: boolean;
  error: string | null;
}
```

### Responsabilidades
- Validar rango de fechas
- Fetch de datos (ingredientes, elaboraciones, recetas)
- Cálculo de variaciones (diff, percent)
- Generación de snapshots históricos
- Manejo de errores

### Datos Retornados

**VariacionItem:**
```typescript
{
  id: string;
  nombre: string;
  tipo: 'ingrediente' | 'elaboracion' | 'receta';
  startPrice: number;      // EUR
  endPrice: number;        // EUR
  diff: number;            // EUR (endPrice - startPrice)
  percent: number;         // % (diff / startPrice * 100)
  detalles?: {
    componentes: ComponenteDesglose[];
  };
}
```

**EscandalloSnapshot:**
```typescript
{
  fecha: string;      // YYYY-MM-DD
  precio: number;     // Promedio EUR
  cantidad: number;   // Cantidad de items
}
```

## 🛠️ Helpers: escandallo-helpers.ts

### Funciones Disponibles

| Función | Descripción |
|---------|-------------|
| `getVariationAlert(percent)` | Retorna colores y badge según % |
| `getChartColor(percent)` | Retorna color para gráfico |
| `getSparklineData(historicalValues)` | Retorna últimos 30 puntos |
| `calculateTrend(data)` | Calcula tendencia: up/down/stable |
| `getSparklineColor(data)` | Retorna color según tendencia |
| `generateSparklinePoints(data)` | Genera puntos SVG para sparkline |
| `isValidDateRange(from, to)` | Valida rango de fechas |
| `calculateSummaryStats(items)` | Calcula stats para KPI cards |

## 📱 Responsividad

- **Mobile (< 768px):**
  - 1 columna en grid KPI
  - Tabla con scroll horizontal
  - Sparklines visibles pero comprimidos
  
- **Tablet (768px - 1024px):**
  - 2 columnas en grid KPI
  - Tabla normal
  
- **Desktop (> 1024px):**
  - 4 columnas en grid KPI
  - Tabla expandida
  - Gráfico a ancho completo

## 🎮 Interacciones

### Búsqueda
- Input en FiltersBar
- Actualiza URL con `?q=term`
- Filtra tabla en tiempo real
- Case-insensitive

### Ordenamiento
- Click en header de columna
- Ciclo: asc → desc → asc
- Indicador ↑↓ en header activo
- URL con `?sortBy=` y `?sortDir=`

### Expandir Fila
- Click en nombre o ChevronDown
- Slide-in de componentes internos
- Tabla interna con cantidad, precio, contribución %
- Cierra al cambiar pestaña

### Tooltip de Alerta
- Aparece al hover si % > 10%
- Posicionado absolutamente (bottom-full)
- Fondo rojo, texto rojo oscuro
- Muestra: "⚠️ CAMBIO SOSPECHOSO", "Subida >10%", "Revisar: +€X.XX"

## 📋 Checklist de QA

- ✅ URL refleja estado (tab, dateFrom, dateTo, q, filterVar, minPercent)
- ✅ No hay títulos redundantes (Breadcrumb ya ubica)
- ✅ Scroll reset al cambiar pestañas (instant)
- ✅ Loading states con esqueletos, no spinners
- ✅ Empty states con iconografía y mensajes
- ✅ Todos los componentes y props tipados
- ✅ Helpers puros fuera del componente
- ✅ Búsqueda debounce 300ms
- ✅ Alertas (>5%) visibles, <5% invisibles
- ✅ Sparklines muestran tendencia
- ✅ Tabla responsive
- ✅ Gráfico carga dinámicamente
- ✅ Expandibles funcionan con animación
- ✅ Colores cumplen escala (verde < -5%, ámbar 5-10%, rojo > 10%)
- ✅ Tooltips al hover en % > 10%
- ✅ Sparklines últimos 30 días
- ✅ Performance OK (memos, debounce, lazy loading)
- ✅ Accesibilidad (labels, aria-label)

## 🚀 Próximos Pasos / Mejoras

### Phase 1 (Actual)
- ✅ Estructura base y componentes
- ✅ URL-driven state
- ✅ Interfaz visual completa

### Phase 2 (Production)
- [ ] Conectar con API real para historico_precios_erp
- [ ] Implementar cálculo recursivo de costos (ingredientes → elaboraciones → recetas)
- [ ] Agregar filtro por tipo de alergeno
- [ ] Exportar a PDF (no solo CSV)
- [ ] Gráficos comparativos (1 vs múltiples items)
- [ ] Predicción de tendencias (ML)

### Phase 3 (Analytics)
- [ ] Guardar "snapshots" en DB para historial
- [ ] Dashboard comparativo (mes a mes)
- [ ] Alertas automáticas (% > 15%)
- [ ] Reportes programados por email

## 📚 Referencias del Proyecto

**Páginas similares:**
- `/app/(dashboard)/analitica/variacion-precios/page.tsx`

**Hooks referencia:**
- `/hooks/use-precio-history.ts`
- `/hooks/use-data-queries.ts`

**Types:**
- `/types/index.ts` → Receta, Elaboracion, IngredienteInterno, HistoricoPreciosERP

**UI Components (shadcn):**
- Card, CardContent, CardHeader, CardTitle, CardDescription
- Tabs, TabsContent, TabsList, TabsTrigger
- Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- Button, Badge, Input, Label
- DatePickerWithRange

**Icons (lucide-react):**
- ArrowUp, ArrowDown, ChevronDown, AlertCircle, AlertTriangle, CheckCircle
- TrendingUp, TrendingDown, Download

**Charts:**
- `/lib/recharts-lazy.tsx` → Lazy load de recharts

**Utils:**
- `/lib/utils` → formatCurrency, cn
- `/lib/supabase` → cliente Supabase

**Estilos:**
- `/style.md` → FUENTE DE VERDAD para arquitectura y UX

## 📞 Contacto & Soporte

Para reportar bugs o sugerencias sobre esta página, contactar al equipo de desarrollo.

---

**Última actualización:** Diciembre 2025
**Status:** ✅ Implementación Completada (v1.0)
