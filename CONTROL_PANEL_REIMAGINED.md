# OS Control Panel: Sistema de Gestión Operativa (Reimagined)

Este documento detalla la arquitectura, lógica y diseño del nuevo Panel de Control de Orden de Servicio (OS), optimizado para una gestión ágil en Desktop y una lectura eficiente en Mobile.

## 1. Concepto Operativo

El Panel de Control deja de ser un formulario largo para convertirse en un **Dashboard de Estado**.

- **Desktop**: Edición fluida tipo "Single Page App" con guardado automático y sincronización en tiempo real (Polling 30s).
- **Mobile**: Modo lectura prioritario. La edición se realiza campo a campo mediante **Sheets (cajones inferiores)** para evitar desplazamientos accidentales de layout.

## 2. Estructura de Datos y Sincronización

### Tablas Nuevas

1. `os_panel_tareas`: Almacena tareas específicas vinculadas a una OS.
   - `id` (UUID), `os_id` (FK), `titulo`, `descripcion`, `estado` (pending, completed), `rol_asignado` (Maître, Cocina, Logística...), `automatica` (boolean).
2. `asignaciones_tareas_config`: Tabla de reglas para generación automática.
   - `campo_trigger`: (ej. `pedido_hielo`)
   - `valor_trigger`: (ej. `true`)
   - `tarea_template`: JSON con título y rol.
3. `os_shared_links`: Tokens para acceso de solo lectura externo.

### Sincronización OS ↔ Control Panel

Ciertos campos críticos se sincronizan automáticamente entre la tabla base `ordenes_servicio` y el panel:

- `metre_responsable` (Maître)
- `jefe_cocina` (Jefe de Cocina)
- `comensales_reales`
- `observaciones_sala` / `observaciones_cocina`

## 3. Lógica de Tareas "Deferred"

Para evitar saturación de la base de datos, los cambios en los interruptores (booleans) disparan una generación de tareas con un delay de **10 segundos**.

- Si el usuario marca `pedido_hielo: true`, el sistema espera 10s. Si no se revierte, genera la tarea para Logística.

## 4. UI/UX: Dashboard Cards (Desktop)

Se elimina el Accordion. El contenido se organiza en tarjetas visuales:

- **Card: Estado General**: Horarios, Metre, Jefe de Cocina, Estado de Confirmación.
- **Card: Logística y Pedidos**: Hielo, ETT, Sushi, Pan, Flores (con contadores visuales).
- **Card: Operativa de Sala**: Montaje, Material Especial, Protocolo.
- **Card: Operativa de Cocina**: Alérgenos, Pases Especiales, Pruebas de Plato.

## 5. Mobile Experience

- **Header Stick**: Información vital (Pax, Hora, Responsables) siempre visible.
- **Read-Only by Default**: No hay inputs directos. Al tocar un dato (ej. el nombre del Metre), se abre un **Sheet (Radix UI)** con el selector o input para cambiarlo.
- **Height Context**: El Sheet ocupa el 40% de la pantalla para mantener el contexto de la OS de fondo.

## 6. PDF Operativo

Generación de un reporte A4 simplificado:

- **Header**: Logo, Fecha, Nombre del Evento, Pax.
- **Secciones**: Tareas Pendientes, Observaciones Críticas, Contactos de Responsables.
- **QR Code**: Enlace al "Shared Link" para que el equipo vea cambios en vivo.

## 7. Plan de Implementación

1. **Fase 1 (DB)**: Ejecución de migraciones de tablas y triggers de sincronización.
2. **Fase 2 (Logic)**: Refactor del hook `useOsPanel` para incluir polling y lógica de cierre/limpieza de caché.
3. **Fase 3 (UI)**: Construcción de los componentes `ControlPanelCards` y `MobileSheetEditor`.
4. **Fase 4 (Tasks)**: Implementación del motor de reglas de tareas automáticas.
5. **Fase 5 (Shared)**: Generación de links públicos y PDF.
