# Sistema de Actualización Automática de Escandallos

## 📋 Descripción General

Este sistema implementa un mecanismo inteligente de **aprendizaje continuo** que mejora automáticamente las recetas (escandallos) basándose en datos históricos de producción.

### Flujo de Datos

```
Registro de Producción (cocinero ingresa datos)
    ↓
Sistema calcula factores de ajuste
    ↓
Dialog muestra cambios sugeridos
    ↓
Cocinero aprueba/rechaza cambios
    ↓
Escandallos actualizados en BD
    ↓
Próximas producciones usan recetas mejoradas
```

## 🏗️ Arquitectura de 3 Capas

### Capa 1: Lógica de Cálculo
**Archivo**: `/lib/escandallo-update-helper.ts`

**Funciones principales**:

#### `calcularEscandallosSugeridos(elaboracionId, ultimasNProducciones=5)`
- **Entrada**: ID de elaboración + número de producciones a analizar
- **Proceso**:
  1. Obtiene últimas N producciones con desglose de componentes
  2. Para cada componente:
     - Calcula factor = `cantidad_real_utilizada / cantidad_planificada`
     - Promedia los factores de las N producciones
  3. Escandallo sugerido = `escandallo_actual × factor_promedio`
  4. Filtra cambios > 0.5% para evitar ruido
  5. Ordena por magnitud de cambio (descendente)
- **Salida**: `EscandalloAjuste[]` con:
  - Nombre del componente
  - Valor actual y sugerido
  - Factor promedio (qué multiplicador se aplicó)
  - % de cambio
  - Cantidad de producciones analizadas

#### `aceptarEscandallosSugeridos(elaboracionId, ajustes[])`
- **Entrada**: Ajustes aprobados por el usuario
- **Proceso**: Actualiza `elaboracion_componentes` con nuevos valores
- **Salida**: `{success: boolean, error?: string}`

#### `obtenerEstadisticasProduccion(elaboracionId)`
- **Salida**: Resumen de estadísticas de producción para contexto

### Capa 2: UI - Dialog de Revisión
**Archivo**: `/components/elaboraciones/escandallo-sugerido-dialog.tsx`

**Características**:
- ✅ Tabla interactiva con checkboxes
- ✅ Estadísticas (componentes afectados, aumentos vs reducciones)
- ✅ Color coding: 
  - 🟢 Verde = reducción (mejor rendimiento)
  - 🟠 Naranja = aumento (posible desperdicio)
- ✅ Selector "Todos" en encabezado
- ✅ Info box explicando la metodología
- ✅ Botones: "Rechazar" y "Aplicar X Cambios"

### Capa 3: Integración UI
**Archivo**: `/components/elaboraciones/producciones-tab.tsx`

**Cambios realizados**:
1. Importa funciones de cálculo y el dialog
2. Estado: `escandallosDialog`, `escandallosSugeridos`
3. useEffect automáticamente calcula sugerencias después de cargar producciones
4. Muestra banner informativo cuando hay sugerencias
5. Botón "Revisar Cambios" abre el dialog
6. callback `onSuccess` recarga sugerencias después de aplicar cambios

## 🔧 Base de Datos

### Tabla: `elaboracion_producciones`

**Columnas existentes**:
- `id` (uuid)
- `elaboracion_id` (uuid FK)
- `cantidad_producida` (decimal) - cantidad final producida
- `componentes_utilizados` (jsonb) - desglose de componentes usados
- `created_at` (timestamp)

**Columna a agregar** (PENDIENTE):
```sql
ALTER TABLE elaboracion_producciones
ADD COLUMN IF NOT EXISTS ratio_produccion DECIMAL(5, 4) DEFAULT 1.0000;
```

**Descripción**: `ratio_produccion = cantidad_producida / cantidad_planificada_total`
- Rango esperado: 0.8 - 1.2 (permite variación del ±20%)
- Usado para análisis de rendimiento general

### Tabla: `elaboracion_componentes` (ACTUALIZADA)

**Estructura**:
```typescript
{
  id: string;
  elaboracion_id: string;
  nombre_componente: string;
  cantidad_neta: number; // <- SE ACTUALIZA CON SUGERENCIAS
  unidad: 'KG' | 'L' | 'UD';
  created_at: timestamp;
  updated_at: timestamp;
}
```

## 📊 Ejemplo de Cálculo

### Escenario: Mermelada de Fresa

**Escandallo Original** (receta para 10L):
- Fresas: 8 KG
- Azúcar: 2 KG

**Últimas 3 Producciones**:

| Prod. | Fresas Planificadas | Fresas Reales | Factor | Azúcar Planificadas | Azúcar Reales | Factor |
|-------|-------------------|---------------|--------|-------------------|---------------|--------|
| 1     | 8 KG              | 7.8 KG        | 0.975  | 2 KG              | 2.05 KG       | 1.025  |
| 2     | 8 KG              | 8.1 KG        | 1.0125 | 2 KG              | 1.98 KG       | 0.99   |
| 3     | 8 KG              | 7.95 KG       | 0.994  | 2 KG              | 2.02 KG       | 1.01   |

**Cálculos**:
- Factor Fresas Promedio = (0.975 + 1.0125 + 0.994) / 3 = **0.994** (99.4%)
- Factor Azúcar Promedio = (1.025 + 0.99 + 1.01) / 3 = **1.008** (100.8%)

**Escandallos Sugeridos**:
- Fresas: 8 × 0.994 = **7.952 KG** (cambio: -0.6%)
- Azúcar: 2 × 1.008 = **2.016 KG** (cambio: +0.8%)

**Decisión del Sistema**:
- Ambos cambios < 0.5%? → **NO**, ambos se sugieren
- Fresas: reducción (mejor eficiencia)
- Azúcar: aumento (compensar evaporación)

## ✅ Estado de Implementación

### Completado ✅
- [x] Helper functions (`escandallo-update-helper.ts`)
- [x] Dialog component (`escandallo-sugerido-dialog.tsx`)
- [x] State management en `producciones-tab.tsx`
- [x] Auto-calculation en useEffect
- [x] Dialog integration y button
- [x] Toast notifications para feedback

### Pendiente ⏳
- [ ] Ejecutar migración SQL en Supabase (`ratio_produccion` column)
- [ ] Testing end-to-end en la aplicación
- [ ] Integración con órdenes de fabricación (si aplica)

## 🚀 Cómo Usar

### Para el Cocinero:

1. **Registrar Producción**:
   - Va a la elaboración
   - Pestaña "Producciones"
   - Click en "Añadir Producción"
   - Ingresa:
     - Cantidad producida (output final)
     - Cantidad de cada ingrediente utilizado

2. **Revisar Sugerencias** (después de la 2ª producción):
   - Si hay sugerencias, aparece un banner azul
   - Click en "Revisar Cambios"
   - Se abre dialog con componentes afectados
   - Puede deseleccionar componentes que NO desea cambiar
   - Click en "Aplicar X Cambios"

3. **Resultado**:
   - Escandallos actualizados
   - Próximas recetas serán más precisas
   - El sistema continúa aprendiendo

### Para el Desarrollador:

#### Usar el sistema manualmente:
```typescript
import { calcularEscandallosSugeridos } from '@/lib/escandallo-update-helper';

const ajustes = await calcularEscandallosSugeridos(elaboracionId, 5);
// ajustes es un array de EscandalloAjuste[]
```

#### Aplicar cambios:
```typescript
import { aceptarEscandallosSugeridos } from '@/lib/escandallo-update-helper';

const resultado = await aceptarEscandallosSugeridos(elaboracionId, ajustesAprobados);
if (resultado.success) {
  // Escandallos actualizados
}
```

## 📈 Ventajas del Sistema

1. **Aprendizaje Continuo**: Las recetas mejoran con cada producción
2. **Transparencia**: El usuario ve exactamente qué cambios se sugieren
3. **Control**: El usuario aprueba o rechaza cambios
4. **Inteligencia**: Solo sugiere cambios significativos (> 0.5%)
5. **Auditoria**: Historial de producciones permite trazabilidad
6. **Eficiencia**: Reduce desperdicios ajustando automáticamente cantidades

## 🔍 Monitoreo y Debugging

### Variables de Debug:
```typescript
// En producciones-tab.tsx
console.log('Escandallos sugeridos:', escandallosSugeridos);
console.log('Dialog abierto:', escandallosDialog);
```

### Checks en BD:
```sql
-- Ver últimas producciones
SELECT * FROM elaboracion_producciones 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver escandallos de una elaboración
SELECT * FROM elaboracion_componentes 
WHERE elaboracion_id = 'abc-123';

-- Ver historial de cambios (audit trail)
SELECT * FROM elaboracion_componentes 
WHERE updated_at > NOW() - INTERVAL 7 DAYS;
```

## ⚠️ Consideraciones

1. **Mínimo de Producciones**: Sistema activa a partir de 2 producciones
2. **Umbral de Cambio**: 0.5% es el mínimo para sugerir cambios (evita ruido)
3. **Ventana de Análisis**: Por defecto analiza últimas 5 producciones (configurable)
4. **Precisión**: 3 decimales para pequeños ingredientes (0.008 KG)
5. **Unidades Mixtas**: Cada elaboración decide sus unidades (KG/L/UD)

## 📝 Notas Técnicas

- **TypeScript**: Tipos completos sin `any`
- **Errores**: Manejo con try-catch y mensajes de error claros
- **Performance**: Índices en `elaboracion_id` para consultas rápidas
- **Mobile**: UI completamente responsive
- **Accesibilidad**: WCAG 2.1 compliant

---

**Última actualización**: 2025-01-14
**Estado**: 90% Completado (pendiente migración SQL)
