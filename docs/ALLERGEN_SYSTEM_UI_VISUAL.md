# 📊 Visualización de la UI - Lógica de Asistentes Explicada

## Vista Actual del Sistema

### Escenario Ejemplo
```
DATOS BASE
├─ Total de Asistentes (Briefing): 100 personas
├─ Asistentes Alérgenos (Confirmado): 20 personas
└─ Asistentes Genéricos (Calculado): 80 personas (100 - 20)
```

---

## Info Bar Compacta (4 Cards Responsivas)

### Vista Desktop (4 Columnas)
```
┌────────────────────┬────────────────────┬────────────────────┬────────────────────┐
│ TOTAL ASISTENTES   │ TOTAL PEDIDO       │ RATIO UNIDADES/PAX │ ESTADO / DESGLOSE  │
│ (Azul)             │ (Naranja/Rojo)     │ (Emerald/Rojo)     │ (Ámbar)            │
├────────────────────┼────────────────────┼────────────────────┼────────────────────┤
│ 100 pax            │ €160.00 genérico   │ 2.00 u/pax         │ PENDIENTE ▼        │
│ ├─ 80 genéricos    │ €50.00 alérgeno 🔴 │ 2.50 u/pax 🔴      │ 📊 Desglose        │
│ └─ +20 🔴          │                    │                    │                    │
└────────────────────┴────────────────────┴────────────────────┴────────────────────┘
```

### Vista Mobile (1 Columna)
```
┌────────────────────────────────┐
│ TOTAL ASISTENTES               │
│ 100 pax                        │
│ ├─ 80 genéricos                │
│ └─ +20 🔴                      │
├────────────────────────────────┤
│ TOTAL PEDIDO                   │
│ €160.00 genérico               │
│ €50.00 alérgeno 🔴             │
├────────────────────────────────┤
│ RATIO UNIDADES/PAX             │
│ 2.00 u/pax genérico            │
│ 2.50 u/pax 🔴                  │
├────────────────────────────────┤
│ ESTADO / DESGLOSE              │
│ PENDIENTE ▼                    │
│ 📊 Desglose                    │
└────────────────────────────────┘
```

---

## Detalles por Card

### Card 1: Total Asistentes (AZUL)
```
╔═══════════════════════════════╗
║ ⭐ TOTAL ASISTENTES           ║ (Encabezado)
╠═══════════════════════════════╣
║ 100 pax                       ║ ← Total SIEMPRE visible
║ ├─ 80 genéricos               ║ ← Asistentes sin alérgeno
║ └─ +20 🔴                     ║ ← Asistentes CON alérgeno
╚═══════════════════════════════╝

LÓGICA DETRÁS:
- asistentes = 100 (del Briefing)
- asistentesAlergenos = 20 (confirmado en el input)
- asistentesGenericos = 100 - 20 = 80 (CALCULADO)
```

**Cuándo aparece**: Siempre
**Color del borde izquierdo**: Azul (información técnica)

---

### Card 2: Total Pedido (NARANJA/ROJO)
```
╔═══════════════════════════════╗
║ 💶 TOTAL PEDIDO               ║ (Encabezado)
╠═══════════════════════════════╣
║ €160.00 genérico              ║ ← Suma de menú genérico
║ €50.00 alérgeno 🔴            ║ ← Suma de menú alérgeno
╚═══════════════════════════════╝

LÓGICA DETRÁS:
- totalPedido = SUM(items * cantidad) donde items = menú GENÉRICO
- allergenTotal = SUM(itemsAlergenos * cantidad) donde itemsAlergenos = menú ALÉRGENO
- Se suman en BD como campos separados
```

**Cuándo aparece**:
- Línea 1: Siempre
- Línea 2: Solo si `asistentesAlergenos > 0`

**Colores**:
- Naranja (€160): Menú genérico
- Rojo (€50): Menú alérgeno 🔴

---

### Card 3: Ratio Unidades/Pax (EMERALD/ROJO)
```
╔═══════════════════════════════╗
║ 📏 RATIO UNIDADES/PAX         ║ (Encabezado)
╠═══════════════════════════════╣
║ 2.00 u/pax genérico           ║ ← Unidades menú / 80 pax
║ 2.50 u/pax 🔴                 ║ ← Unidades menú alérgeno / 20 pax
╚═══════════════════════════════╝

LÓGICA DETRÁS:
- ratioGenericos = totalUnitsGenericos / asistentesGenericos
  = 160 units / 80 pax = 2.00 u/pax
  
- ratioAlergenos = totalUnitsAlergenos / asistentesAlergenos
  = 50 units / 20 pax = 2.50 u/pax

⚠️ IMPORTANTE: Cada menú usa SU PROPIO DENOMINADOR
```

**Cuándo aparece**:
- Línea 1: Siempre (menú genérico)
- Línea 2: Solo si `asistentesAlergenos > 0`

**Colores**:
- Emerald (2.00): Menú genérico
- Rojo (2.50): Menú alérgeno 🔴

---

### Card 4: Estado / Desglose (ÁMBAR)
```
╔═══════════════════════════════╗
║ 🏷️ ESTADO / DESGLOSE          ║ (Encabezado)
╠═══════════════════════════════╣
║ [Selector Estado]             ║ ← Pendiente / En prep / Listo / Incidencia
║  └─ PENDIENTE ▼               ║
║                               ║
║ 📊 Desglose [clickeable]       ║ ← Abre Modal
╚═══════════════════════════════╝
```

**Cuándo aparece**: Siempre

---

## Modal: Desglose de Costos (Al hacer click en "Desglose")

```
╔════════════════════════════════════════════════════╗
║              DESGLOSE DE COSTOS (POR PAX)          ║ (Título)
╠════════════════════════════════════════════════════╣
║                                                    ║
║ MENÚ GENÉRICO (80 pax)                            ║
│ ├─ Total Servicio: €160.00                        ║
│ └─ Costo por Persona: €2.00/pax                   ║
║                                                    ║
║ MENÚ ALÉRGENO 🔴 (20 pax)                          ║
│ ├─ Total Servicio: €50.00                         ║
│ └─ Costo por Persona: €2.50/pax                   ║
║                                                    ║
╠════════════════════════════════════════════════════╣
║ TOTAL SERVICIO                                     ║
│ ├─ Total de Pax: 100 (80 + 20)                   ║
│ ├─ Ingresos Totales: €210.00 (€160 + €50)        ║
│ └─ Costo/Pax Promedio: €2.10 (€210/100)          ║
╚════════════════════════════════════════════════════╝

FÓRMULAS:
- costoPaxGenericos = totalGenericos / asistentesGenericos = €160 / 80 = €2.00
- costoPaxAlergenos = totalAlergenos / asistentesAlergenos = €50 / 20 = €2.50
- costoPaxPromedio = totalCombinado / asistentesTotales = €210 / 100 = €2.10
```

**Cuándo se abre**: Click en icono 📊 o en card 4

---

## Ejemplo Visual Completo: 100 Pax

### Paso 1: Usuario abre la página
```
Se carga del Briefing:
├─ 100 asistentes totales
└─ Mostrar Card 1 con: 100 pax (pero campo alérgenos vacío)
```

### Paso 2: Usuario entra "20" en el input de Alérgenos
```
Input actualizado:
┌──────────────────────────────┐
│ 🔴 Asistentes con alérgenos  │
│ [    20    ]                 │
└──────────────────────────────┘

Sistema recalcula automáticamente:
├─ asistentesGenericos = 100 - 20 = 80
├─ Card 1 se actualiza (muestra desglose)
├─ Card 3 recalcula ratios
└─ Info Bar se refresca en tiempo real
```

### Paso 3: Usuario añade platos al menú GENÉRICO
```
Tabla de Platos Genéricos:
┌──────────┬──────────┬──────────┐
│ Plato    │ Cantidad │ PVP      │
├──────────┼──────────┼──────────┤
│ Merluza  │ 80 unid  │ €1.00/u  │ ← 80 pax × 1 = 80 units
│ Pechuga  │ 80 unid  │ €1.00/u  │ ← 80 pax × 1 = 80 units
└──────────┴──────────┴──────────┘

Totales del Menú Genérico:
├─ Total Unidades: 160
├─ Total Precio: €160.00
└─ Ratio: 160 / 80 pax = 2.00 u/pax ✓

Card 2 muestra: €160.00 genérico
Card 3 muestra: 2.00 u/pax genérico
```

### Paso 4: Usuario añade platos al menú ALÉRGENO
```
Tabla de Platos Alérgenos:
┌──────────┬──────────┬──────────┐
│ Plato    │ Cantidad │ PVP      │
├──────────┼──────────┼──────────┤
│ Salmón   │ 20 unid  │ €1.25/u  │ ← 20 pax × 1 = 20 units
│ Arroz    │ 30 unid  │ €1.00/u  │ ← 20 pax × 1.5 = 30 units
└──────────┴──────────┴──────────┘

Totales del Menú Alérgeno:
├─ Total Unidades: 50
├─ Total Precio: €50.00 (20 × €1.25 + 30 × €1.00 - simplificado)
└─ Ratio: 50 / 20 pax = 2.50 u/pax ✓

Card 2 muestra: €50.00 alérgeno 🔴
Card 3 muestra: 2.50 u/pax 🔴
```

### Resultado Final en Info Bar
```
┌────────────────────┬────────────────────┬────────────────────┐
│ TOTAL ASISTENTES   │ TOTAL PEDIDO       │ RATIO UNIDADES/PAX │
│ 100 pax            │ €160.00 genérico   │ 2.00 u/pax         │
│ ├─ 80 genéricos    │ €50.00 alérgeno 🔴 │ 2.50 u/pax 🔴      │
│ └─ +20 🔴          │                    │                    │
└────────────────────┴────────────────────┴────────────────────┘
```

---

## Casos Edge Case & Comportamiento

### Caso 1: Sin alérgenos (asistentesAlergenos = 0)
```
Input alérgenos:
┌──────────────────────────────┐
│ 🔴 Asistentes con alérgenos  │
│ [     0     ]                │
└──────────────────────────────┘

Resultado en Info Bar:
┌────────────────────┬────────────────────┬────────────────────┐
│ TOTAL ASISTENTES   │ TOTAL PEDIDO       │ RATIO UNIDADES/PAX │
│ 100 pax            │ €160.00 genérico   │ 2.00 u/pax         │
│ (sin desglose)     │ (sin alérgeno)     │ (sin alérgeno)     │
└────────────────────┴────────────────────┴────────────────────┘

✓ Card 1: Muestra 100, sin desglose detallado
✓ Card 2: Solo genérico
✓ Card 3: Solo genérico
✓ Modal Desglose: Solo muestra sección genérico
```

### Caso 2: Todos alérgenos (asistentesAlergenos = 100)
```
asistentesAlergenos = 100
asistentesGenericos = 100 - 100 = 0

Resultado en Info Bar:
┌────────────────────┬────────────────────┬────────────────────┐
│ TOTAL ASISTENTES   │ TOTAL PEDIDO       │ RATIO UNIDADES/PAX │
│ 100 pax            │ - genérico (0)     │ - genérico (0)     │
│ ├─ 0 genéricos     │ €50.00 alérgeno 🔴 │ 2.50 u/pax 🔴      │
│ └─ +100 🔴         │                    │                    │
└────────────────────┴────────────────────┴────────────────────┘

⚠️ Nota: Tabla genérica muestra "vacío" pero no error
✓ Todo funciona correctamente (0 genéricos es válido)
```

### Caso 3: Cambio dinámico
```
Usuario cambia de 20 → 30 alérgenos

ANTES:
- asistentesGenericos = 80
- Ratio genérico: 2.00 u/pax

DESPUÉS (automático, sin guardar):
- asistentesGenericos = 70
- Ratio genérico: 160 / 70 = 2.29 u/pax (actualizado)

✓ Info Bar se actualiza en tiempo real
✓ Ratios recalculados automáticamente
```

---

## Flujo de Guardado

### Cuando el usuario hace click en "Guardar Pedido"

```
DATOS ENVIADOS A BD:
{
  briefing_item_id: "abc-123",
  os_id: "uuid-xxx",
  status: "Pendiente",
  items: [ /* menú GENÉRICO */ ],
  total: 160.00,
  asistentes_alergenos: 20,           ← NUEVO
  items_alergenos: [ /* menú ALÉRGENO */ ],  ← NUEVO
  total_alergenos: 50.00              ← NUEVO
}

ALMACENAMIENTO EN SUPABASE:
- asistentes_alergenos (INT): 20
- items_alergenos (JSONB): [{...}, {...}]
- total_alergenos (NUMERIC): 50.00

MENSAJEPARA EL USUARIO:
Toast: ✓ Pedido Guardado
       160 platos + 50 alérgenos | Total: €210.00
```

---

## Checklist: ¿Funciona correctamente?

- [ ] Info Bar muestra 4 cards
- [ ] Card 1 muestra desglose: "80 genéricos + 20 🔴"
- [ ] Card 2 muestra dos totales: "€160 genérico" + "€50 alérgeno"
- [ ] Card 3 muestra dos ratios: "2.00 u/pax genérico" + "2.50 u/pax"
- [ ] Modal desglose abre correctamente
- [ ] Datos se guardan en BD sin errores
- [ ] Al recargar la página, datos persisten
- [ ] Cambiar input de alérgenos actualiza ratios en tiempo real
- [ ] Añadir items actualiza totales y ratios
- [ ] Toast muestra mensaje correcto al guardar

---

**Si todo está ✓, el sistema funciona correctamente.**
