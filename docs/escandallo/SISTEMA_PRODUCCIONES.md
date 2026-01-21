# Sistema de Producciones en Elaboraciones

## Descripción General

Se ha implementado un sistema completo para registrar y gestionar **producciones de elaboraciones**. Cada producción captura los componentes reales utilizados y la cantidad final producida, permitiendo calcular automáticamente ajustes de receta basados en la media de múltiples producciones.

## Componentes Creados

### 1. **Base de Datos**
- **Tabla**: `elaboracion_producciones`
- **Ubicación**: `/migrations/20251213_create_elaboracion_producciones.sql`
- **Campos principales**:
  - `id`: UUID único
  - `elaboracion_id`: Referencia a la elaboración
  - `fecha_produccion`: Fecha/hora del registro
  - `responsable`: Email del usuario que registró
  - `cantidad_real_producida`: Output real de la producción
  - `componentes_utilizados`: Array JSON con detalles de cada componente
  - `observaciones`: Notas opcionales

### 2. **Tipos TypeScript**
- **Ubicación**: `/types/index.ts`
- **Nuevos tipos**:
  - `ComponenteProducido`: Estructura de cada componente en una producción
  - `ElaboracionProduccion`: Registro completo de una producción
  - `MediaProducciones`: Resultado del análisis de media
  - `AjusteComponente`: Ajuste sugerido por componente

### 3. **Funciones de Cálculo**
- **Ubicación**: `/lib/elaboraciones-helpers.ts`
- **Funciones principales**:
  - `calcularMediaProducciones()`: Calcula media y ajustes sugeridos
  - `aplicarAjustesAProducciones()`: Aplica los ajustes a la receta
  - `calcularConfianza()`: Determina nivel de confianza en los datos
  - `formatearAjuste()`: Formatea porcentajes para UI

### 4. **Componentes React**

#### **ProduccionesTab**
- **Ubicación**: `/components/elaboraciones/producciones-tab.tsx`
- **Funcionalidad**:
  - Tabla con listado de todas las producciones
  - Muestra: fecha, responsable, cantidad producida, número de componentes
  - Botones para editar y eliminar
  - Panel estadístico con:
    - Número total de producciones
    - Rendimiento promedio (%)
    - Variabilidad (desviación estándar)
    - Nivel de confianza (baja/media/alta)
  - Sección de "Ajustes Sugeridos" que muestra cambios necesarios en componentes

#### **AñadirProduccionDialog**
- **Ubicación**: `/components/elaboraciones/anadir-produccion-dialog.tsx`
- **Funcionalidad**:
  - Modal para crear/editar producciones
  - Campo: Cantidad real producida
  - Tabla editable con componentes pre-completados:
    - Cantidad planificada vs real
    - Cálculo automático de merma %
  - Campo de observaciones
  - Obtiene automáticamente el usuario autenticado (responsable)

### 5. **Integración en Página Principal**
- **Ubicación**: `/app/(dashboard)/book/elaboraciones/[[...id]]/page.tsx`
- **Cambios**:
  - Nueva pestaña "Producciones" (visible solo en edición)
  - Estado `isProduccionDialogOpen` para controlar el modal
  - Estado `mediaProducciones` para almacenar datos de media
  - Componentes integrados en la estructura de tabs

## Flujo de Uso

### Registrar una Nueva Producción

1. Abre una elaboración existente
2. Ve a la pestaña "Producciones"
3. Haz clic en "Registrar Producción"
4. Se abre un modal con:
   - Campo para cantidad real producida
   - Tabla con todos los componentes (pre-completados con valores base)
   - Edita las cantidades reales utilizadas
   - La merma se calcula automáticamente
   - Opcionalmente añade observaciones
5. Haz clic en "Registrar"

### Analizar Ajustes Sugeridos

1. En la pestaña "Producciones", se muestra un panel azul con estadísticas:
   - **Producciones**: Número total registradas
   - **Rendimiento Promedio**: Media de (cantidad_real / cantidad_planificada)
   - **Variabilidad**: Desviación estándar del rendimiento
   - **Confianza**: Nivel de fiabilidad de los datos

2. Debajo, un panel ámbar muestra "Ajustes Sugeridos":
   - Cada componente con ajuste > 2% aparece en la lista
   - Muestra: cantidad actual → cantidad sugerida
   - Porcentaje de cambio (rojo = aumentar, verde = reducir)

### Editar o Eliminar Producciones

1. En la tabla de producciones, cada fila tiene dos botones:
   - **Lápiz**: Editar la producción
   - **Papelera**: Eliminar (con confirmación)
2. Al eliminar, se recalcula automáticamente la media

## Niveles de Confianza

- **Baja**: < 3 producciones O variabilidad > 20%
- **Media**: 3-5 producciones Y variabilidad 10-20%
- **Alta**: > 5 producciones Y variabilidad < 10%

## Cálculos Internos

### Rendimiento Promedio
```
rendimiento = suma(cantidad_real) / (count * cantidad_planificada)
```

### Variabilidad
```
desviacion_estandar = sqrt(suma((rendimiento - media)²) / count)
```

### Ajustes Sugeridos
```
ajuste% = ((cantidad_real_promedio - cantidad_planificada) / cantidad_planificada) * 100
```

## Requisitos

- El usuario debe estar autenticado (se obtiene del contexto `useAuth()`)
- La elaboración debe existir y estar siendo editada
- Los componentes deben estar definidos en la elaboración

## Producción

### Descripción

Se registran las producciones de cada elaboración, indicando los componentes utilizados y la cantidad producida.

### Campos

- `id`: Identificador único de la producción.
- `elaboracion_id`: Referencia a la elaboración correspondiente.
- `fecha_produccion`: Fecha y hora en que se realizó la producción.
- `responsable`: Usuario que registró la producción.
- `cantidad_real_producida`: Cantidad efectivamente producida.
- `componentes_utilizados`: Detalle de los componentes y cantidades usadas.
- `observaciones`: Notas adicionales sobre la producción.

## Detalles

### Tabla de Producciones

| ID  | Fecha                | Responsable         | Cantidad Producida | Componentes Utilizados | Observaciones |
|-----|----------------------|---------------------|--------------------|-----------------------|---------------|
| UUID| YYYY-MM-DD HH:MM:SS  | email@ejemplo.com   | 100                | [{componente: "Harina", cantidad: 50}, ...] | "Producción inicial" |

### Cálculos Automáticos

- **Merma %**: `(Cantidad Planificada - Cantidad Real Producida) / Cantidad Planificada * 100`
- **Rendimiento**: `Cantidad Real Producida / Cantidad Planificada`

## Ejemplo

### Registro de Producción

- Abre la elaboración "Pan de Masa Madre"
- Ve a la pestaña "Producciones"
- Haz clic en "Registrar Producción"
- Completa con:
  - **Cantidad real producida**: 80
  - **Componentes**:
    - Harina: 50
    - Agua: 30
    - Sal: 5
- Observaciones: "Ajuste en la hidratación"
- Resultado esperado:
  - Merma %: 10%
  - Rendimiento: 90%

## Resumen

- Se registró una nueva producción para la elaboración seleccionada.
- Los cálculos de merma y rendimiento se actualizaron automáticamente.
- La media de producciones se recalculó incluyendo la nueva entrada.

## Tabla ejemplo

| Columna 1 | Columna 2 | Columna 3 | Columna 4 |
|-----------|-----------|-----------|-----------|
| Valor 1   | Valor 2   | Valor 3   | Valor 4   |

## Próximas Mejoras Opcionales

1. **Aplicar Ajustes Automáticos**: Botón para aplicar los ajustes sugeridos directamente a la receta
2. **Gráficas de Tendencia**: Mostrar evolución del rendimiento en el tiempo
3. **Exportar Datos**: Descargar CSV de todas las producciones
4. **Comparación**: Vista lateral de antes/después de ajustes
5. **Alertas**: Notificar cuando variabilidad es muy alta
6. **Historial**: Guardar versiones anteriores de la receta cuando se aplican ajustes

## Archivos Modificados

1. `types/index.ts` - Nuevos tipos
2. `app/(dashboard)/book/elaboraciones/[[...id]]/page.tsx` - Integración
3. Creados 3 nuevos archivos:
   - `/lib/elaboraciones-helpers.ts`
   - `/components/elaboraciones/producciones-tab.tsx`
   - `/components/elaboraciones/anadir-produccion-dialog.tsx`
4. Creada migración SQL

## Testing

Para probar el sistema:

1. Crea una elaboración con varios componentes
2. Registra al menos 2-3 producciones con variaciones en cantidades
3. Observa cómo se calculan automáticamente:
   - Merma % de cada componente
   - Estadísticas de rendimiento
   - Ajustes sugeridos por componente
4. Prueba editar y eliminar producciones
