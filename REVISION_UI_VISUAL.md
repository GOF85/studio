# UI Visual - Revisión Requerida

## Sección "Revisión Requerida" - Vista Completa

### Estado 1: Checkbox Desmarcado (Default)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Revisión Requerida                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ☐ ¿Requiere revisión?                                     │
│                                                             │
│  (Los campos de abajo no aparecen)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Estado 2: Checkbox Marcado (Con Revisión)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Revisión Requerida                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ☑ ¿Requiere revisión?                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ COMENTARIOS                                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Revisar la proporción de sal y especias            │   │
│  │ Aumentar tiempo de cocción en 5 minutos             │   │
│  │ Verificar con jefe de cocina                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │ RESPONSABLE          │  │ FECHA DE REVISIÓN        │   │
│  ├──────────────────────┤  ├──────────────────────────┤   │
│  │ maria@empresa.com    │  │ 15/1/2025                │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Estado 3: Después de Guardar (Fields Auto-Populated)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Revisión Requerida                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ☑ ¿Requiere revisión?                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ COMENTARIOS                                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Revisar la proporción de sal y especias            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │ RESPONSABLE          │  │ FECHA DE REVISIÓN        │   │
│  ├──────────────────────┤  ├──────────────────────────┤   │
│  │ tu@empresa.com       │  │ 15/1/2025 14:35          │   │
│  │ (read-only)          │  │ (read-only)              │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  ℹ️  Los campos Responsable y Fecha se establecen al       │
│      guardar automáticamente con el usuario actual         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Lista de Elaboraciones - Vista Móvil

### Item SIN Revisión Requerida
```
┌─────────────────────────────────────────┐
│ Masa Básica para Pizzas        │ FRIO  │
│                                │       │
│ €0.89 / KG                       → │
└─────────────────────────────────────────┘
```

### Item CON Revisión Requerida
```
┌──────────────────────────────────────────┐  ← Borde amber
│ Relleno de Pistacho         ⚠️  │ FRIO  │
│                              │       │
│ €2.45 / KG                       → │
└──────────────────────────────────────────┘
  ↑                                 ↑
  Fondo amber claro           AlertCircle amber
```

---

## Lista de Elaboraciones - Vista Desktop

### Tabla Completa
```
┌──────┬──────────────────────────────────┬──────────┬─────────────┬─────┐
│  ☑   │ Nombre                        ⚠️  │ Partida  │ Coste / Ud  │     │
├──────┼──────────────────────────────────┼──────────┼─────────────┼─────┤
│  ☐   │ Masa Básica para Pizzas          │ FRIO     │ €0.89       │ ✎ ⊗ │
├──────┼──────────────────────────────────┼──────────┼─────────────┼─────┤
│  ☐   │ Relleno de Pistacho             ⚠️  │ CONGELADO│ €2.45      │ ✎ ⊗ │  ← Fondo amber
├──────┼──────────────────────────────────┼──────────┼─────────────┼─────┤
│  ☐   │ Crema de Frutas Rojas            │ FRIO     │ €1.23       │ ✎ ⊗ │
└──────┴──────────────────────────────────┴──────────┴─────────────┴─────┘

Leyenda:
  ⚠️  = AlertCircle icon (amber)
  🟡 = Fondo amber-50/40 hover:amber-50/60
```

---

## Styling Detallado

### Sección Revisión Card
```css
/* Card Container */
border: 1px solid #fcd34d (amber-200)
background: rgba(254, 243, 199, 0.5) (amber-50/50 dark:amber-900/10)

/* Card Header */
border-bottom: 1px solid #fcd34d (amber-200)
background: rgba(255, 230, 109, 0.3) (amber-100/30 dark:amber-900/20)

/* Title */
color: #78350f (amber-900 dark:amber-100)
font-weight: bold
font-size: small
```

### Checkbox
```css
/* Checkbox Input */
accent-color: #b45309 (amber-600)
width: 16px (h-4 w-4)
height: 16px
border-radius: 4px
```

### Campos Read-Only
```css
/* Container */
display: flex
align-items: center
height: 32px (h-8)
padding-left: 12px (px-3)
padding-right: 12px (px-3)
background: #f3f4f6 (bg-gray-100 dark:bg-gray-800)
border: 1px solid #e5e7eb (border-gray-200 dark:border-gray-700)
border-radius: 6px

/* Text */
color: #374151 (text-gray-700 dark:text-gray-300)
font-size: small
pointer-events: none
```

### Label
```css
/* Label */
font-size: 10px
text-transform: uppercase
font-weight: bold
color: #9ca3af (text-muted-foreground)
```

---

## Transiciones y Animaciones

### Mostrar/Ocultar Campos
```typescript
// Aparecen cuando checkbox se marca
{form.watch('requiereRevision') && (
  <>
    {/* Campos se animan suavemente */}
  </>
)}
```

### Al Guardar
```
1. Usuario hace click en "Guardar"
2. Spinner aparece (saving state)
3. Email se captura del servidor
4. Fecha se captura del servidor
5. form.setValue() actualiza UI
6. Campos read-only muestran nuevos valores
7. Confirmación: "Elaboración guardada"
8. Redirecciona a lista
```

---

## Estados de Error (Si Aplica)

### Error: Usuario no autenticado
```
⚠️  ERROR
────────────────────────
No hay usuario autenticado
Responsable: —
Fecha: —

(El sistema fallsafe a 'Sistema' en responsable)
```

### Warning: Cambios no guardados
```
⚠️  CAMBIOS NO GUARDADOS
────────────────────────────────────
Si sales sin guardar, se perderán
los cambios en la revisión.
```

---

## Responsive Design

### Mobile (< 768px)
```
┌─────────────────────────┐
│ ⚠️  Revisión Requerida  │
├─────────────────────────┤
│ ☑ ¿Requiere revisión?   │
│                         │
│ Comentarios:            │
│ ┌─────────────────────┐ │
│ │ (Textarea)          │ │
│ └─────────────────────┘ │
│                         │
│ Responsable:            │
│ ┌─────────────────────┐ │
│ │ maria@empresa.com   │ │
│ └─────────────────────┘ │
│                         │
│ Fecha de Revisión:      │
│ ┌─────────────────────┐ │
│ │ 15/1/2025           │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```

### Tablet/Desktop (>= 768px)
```
┌───────────────────────────────────────────┐
│ ⚠️  Revisión Requerida                    │
├───────────────────────────────────────────┤
│ ☑ ¿Requiere revisión?                    │
│                                           │
│ Comentarios:                              │
│ ┌───────────────────────────────────────┐ │
│ │ (Textarea - 3 rows)                   │ │
│ │                                       │ │
│ │                                       │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌─────────────────┐  ┌─────────────────┐ │
│ │ RESPONSABLE     │  │ FECHA DE REVISIÓN
│ │ maria@empresa   │  │ 15/1/2025       │ │
│ └─────────────────┘  └─────────────────┘ │
│                                           │
└───────────────────────────────────────────┘
  (2 columnas en tablet/desktop, 1 en mobile)
```

---

## Acciones Disponibles

### Click en Checkbox
```
Sin marcar → Marcar
└─ Campos aparecen con animación suave

Marcado → Sin marcar
└─ Campos desaparecen con animación suave
```

### Click en Comentarios
```
Usuario puede escribir/editar el comentario
└─ El campo es un Textarea editable
```

### Click en Responsable/Fecha
```
Nada pasa - son campos read-only
└─ Solo se actualizan automáticamente al guardar
```

### Click en Guardar
```
1. Validaciones de formulario
2. Captura usuario si requiere_revision = true
3. Captura fecha si requiere_revision = true
4. Envía a servidor
5. Guarda en BD
6. Muestra confirmación
└─ Redirecciona a lista (opcional)
```

---

## Textos y Mensajes

### Labels
- "¿Requiere revisión?" → Pregunta si necesita revisión
- "Comentarios" → Notas sobre qué revisar
- "Responsable" → Quién la marcó para revisión
- "Fecha de Revisión" → Cuándo se marcó

### Placeholders
- Comentarios: "Describir qué requiere revisión..."

### Mensajes
- Guardado: "Elaboración guardada correctamente."
- Error: "Error al guardar la elaboración."
- Info: "Los campos Responsable y Fecha se capturan automáticamente"

### Valores por Defecto
- Responsable: "—" (cuando no está establecido)
- Fecha: "—" (cuando no está establecida)

---

## Iconos Utilizados

### AlertCircle (amber)
```
Size: 16x16 (h-4 w-4)
Color: amber-600 (#d97706)
Usado en:
- Nombre de elaboración (lista desktop)
- Nombre de elaboración (lista mobile)
- Header de sección revisión (implícito en diseño)
```

---

## Colores Utilizados

### Amber (Revisión)
```
amber-50:   #fef3c7  (bg light)
amber-100:  #fde68a  (header bg)
amber-200:  #fcd34d  (border)
amber-500:  #f59e0b  (border-left mobile)
amber-600:  #d97306  (icon color)
amber-900:  #78350f  (text)
```

### Gray (Read-Only)
```
gray-100:   #f3f4f6  (bg)
gray-200:   #e5e7eb  (border)
gray-300:   #d1d5db  (hover)
gray-700:   #374151  (text)
gray-800:   #1f2937  (dark bg)
```

---

## Fuentes y Tamaños

```
Label:    text-xs (12px), uppercase, bold
Textarea: text-sm (14px)
Read-only: text-sm (14px)
Title:    text-sm (14px), bold
```

---

## Estados de Interacción

### Hover
```
Checkbox:     cursor-pointer, slight scale change
Comentarios:  focus ring
Responsable:  (no hover, read-only)
Fecha:        (no hover, read-only)
```

### Focus
```
Checkbox:     blue focus ring
Comentarios:  blue focus ring, border highlight
```

### Disabled
```
(No hay campos deshabilitados, solo read-only)
```

### Loading
```
Button: spinner aparece, texto cambió a "Guardando..."
```
