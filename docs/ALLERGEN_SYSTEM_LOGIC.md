# 🔴 Lógica de Asistentes y Alérgenos - Clarificación

## Conceptos Clave

### 1. **Asistentes Totales (Constante)**
- Definido en el Briefing Comercial
- **No cambia** durante la gestión de gastronomía
- Ejemplo: 100 personas contratadas

### 2. **Asistentes Alérgenos (Variable)**
- Confirmado por el usuario en Gastronomía
- Número de personas con alérgeno declarado
- Ejemplo: 20 personas

### 3. **Asistentes Genéricos (Calculado)**
- **Fórmula**: Asistentes Totales - Asistentes Alérgenos
- Personas que NO tienen alérgeno
- Ejemplo: 100 - 20 = 80 personas

---

## Cálculo de Ratios

Cada menú (genérico vs alérgeno) tiene su **propio denominador** para el ratio:

### Ratio Genérico
```
Ratio Genérico = Total Unidades Menú Genérico / Asistentes Genéricos
```
- Ejemplo: 160 unidades / 80 asistentes = **2.00 u/pax**

### Ratio Alérgeno
```
Ratio Alérgeno = Total Unidades Menú Alérgeno / Asistentes Alérgenos
```
- Ejemplo: 50 unidades / 20 asistentes = **2.50 u/pax**

---

## Visualización en la UI

### Info Bar Compacta (4 Cards)

#### Card 1: Total Asistentes (Azul)
```
TOTAL ASISTENTES
100 pax
├─ 80 genéricos
└─ +20 🔴
```
- Siempre visible
- Muestra desglose: genéricos + alérgenos

#### Card 2: Total Pedido (Naranja/Rojo)
```
TOTAL PEDIDO
€160.00 genérico
€50.00 alérgeno 🔴
```
- Dos precios independientes
- Naranja para genérico, Rojo para alérgeno
- Visible solo si hay alérgenos

#### Card 3: Ratio Unidades/Pax (Emerald/Rojo)
```
RATIO UNIDADES/PAX
2.00 u/pax genérico
2.50 u/pax 🔴
```
- Dos ratios independientes
- Cada uno respeta su denominador
- Visible solo si hay alérgenos

#### Card 4: Estado / Desglose (Ámbar)
```
ESTADO / DESGLOSE
[Selector: Pendiente / En prep / Listo]
```
- Acceso al Modal de Desglose
- Modal muestra detalles financieros

---

## Desglose de Costos (Modal)

### Cuando el usuario abre "Desglose"

```
╔════════════════════════════════════════╗
║     DESGLOSE DE COSTOS (POR PAX)      ║
╠════════════════════════════════════════╣
║ MENÚ GENÉRICO (80 pax)                ║
├─ Total: €160.00                        ║
├─ Por Pax: €2.00                        ║
│                                        ║
║ MENÚ ALÉRGENO 🔴 (20 pax)              ║
├─ Total: €50.00                         ║
├─ Por Pax: €2.50                        ║
│                                        ║
║ TOTAL SERVICIO                         ║
├─ Pax Totales: 100                      ║
├─ Ingresos: €210.00                     ║
└─ Costo/Pax Promedio: €2.10             ║
╚════════════════════════════════════════╝
```

---

## Flujo de Datos en el Formulario

### Al Cargar la Página
1. Se carga el briefing (100 asistentes)
2. Se carga la orden guardada (20 alérgenos, items genéricos, items alérgenos)

### Al Cambiar Asistentes Alérgenos (Input)
- Usuario entra: "20"
- Sistema calcula automáticamente: asistentes genéricos = 100 - 20 = **80**
- Info Bar se actualiza en tiempo real
- Ratios se recalculan

### Al Añadir Items Genéricos
- Sistema suma unidades del menú genérico
- Ratio genérico = unidades genéricas / 80
- Info Bar se actualiza

### Al Añadir Items Alérgenos
- Sistema suma unidades del menú alérgeno
- Ratio alérgeno = unidades alérgenas / 20
- Card de alérgenos se activa (si estaba oculta)

### Al Guardar
- Envía a BD:
  - `asistentes_alergenos`: 20
  - `items_alergenos`: [...items]
  - `total_alergenos`: €50.00
  - `items`: [...items genéricos]
  - `total`: €160.00

---

## Ejemplo Completo

### Escenario
- **Contratados**: 100 personas
- **Alérgenos confirmados**: 15 personas (DPI, gluten, etc.)
- **Genéricos**: 85 personas

### Composición Menú Genérico
- 4 platos × 85 pax = 340 unidades
- Ratio: 340 / 85 = **4.00 u/pax**
- Total: €340.00

### Composición Menú Alérgeno
- 4 platos × 15 pax = 60 unidades
- Ratio: 60 / 15 = **4.00 u/pax**
- Total: €60.00

### En la UI
```
┌─────────────────────────────────────────────┐
│ TOTAL ASISTENTES        TOTAL PEDIDO         │
│ 100 pax                 €340.00 genérico    │
│ ├─ 85 genéricos         €60.00 alérgeno 🔴  │
│ └─ +15 🔴                                    │
├─────────────────────────────────────────────┤
│ RATIO UNIDADES/PAX      ESTADO / DESGLOSE   │
│ 4.00 u/pax genérico     [Pendiente ▼]       │
│ 4.00 u/pax 🔴           [📊 Desglose]       │
└─────────────────────────────────────────────┘
```

---

## Cambios Implementados en el Código

### Archivo: `/app/(dashboard)/os/[numero_expediente]/gastronomia/[briefingItemId]/page.tsx`

#### Componente `GastroInfoBar`
- ✅ Ahora calcula `asistentesGenericos = asistentes - asistentesAlergenos`
- ✅ Watch separado para `watchedAllergenItems`
- ✅ Dos totales independientes: `totalPedido` (genérico) y `allergenTotal`
- ✅ Dos ratios: `ratioGenericos` y `ratioAlergenos`
- ✅ Mostrar/ocultar info de alérgenos condicionalmente
- ✅ Pasar valores correctos a `CostBreakdownModal`

#### Card 1: Asistentes
- Muestra Total (100)
- Desglose en dos líneas: "85 genéricos" + "+15 🔴"

#### Card 2: Totales
- Línea 1: Precio genérico (genérico)
- Línea 2: Precio alérgeno (visible solo si asistentesAlergenos > 0)

#### Card 3: Ratios
- Línea 1: Ratio genérico
- Línea 2: Ratio alérgeno (visible solo si asistentesAlergenos > 0)

#### Card 4: Estado
- Modal recibe: `regularPax={asistentesGenericos}`, `allergenPax={asistentesAlergenos}`

---

## Casos Edge Case

### ¿Qué pasa si asistentesAlergenos = 0?
- Asistentes genéricos = 100 - 0 = 100
- Card 3 (Ratio): Solo muestra ratio genérico (2.00)
- Card 2 (Total): Solo muestra total genérico (€160.00)
- Info bar compacta (sin línea de alérgenos)

### ¿Qué pasa si asistentesAlergenos = asistentes?
- Asistentes genéricos = 100 - 100 = 0
- Ratio genérico = unidades / 0 = Infinito (prevenido con check)
- UI muestra "sin datos" para genérico
- Válido si todos tienen alérgeno

### ¿Qué pasa si asistentesAlergenos > asistentes?
- Sistema previene esto (Math.max(0, ...))
- Asistentes genéricos = 100 - 150 = 0 (no negativo)
- Se recomienda validar en form schema

---

## Validación Recomendada (Zod Schema)

```typescript
asistentesAlergenos: z.coerce
  .number()
  .min(0, "No puede ser negativo")
  .max(z.number(), "No puede ser mayor al total de asistentes")
  .optional()
  .default(0)
```

---

## Resumen Ejecutivo

### Para Cocina
- **Ve**: 100 pax total, 80 genéricos, 20 alérgenos
- **Ratio genérico**: 2.00 u/pax (80 personas)
- **Ratio alérgeno**: 2.50 u/pax (20 personas)
- **Claridad**: Cada menú tiene su próprio denominador ✓

### Para Comercial
- **Ingreso total**: €210 (€160 + €50)
- **Margen**: Calculado por menú
- **Desglose**: Visible en modal (costos diferenciados)

### Para Dirección
- **Cumplimiento**: 100 pax contratadas = 80 + 20 ✓
- **Trazabilidad**: Auditable en BD (ambos menus separados)
