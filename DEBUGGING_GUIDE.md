# Guía de Debugging - Control Panel OS

## Estado: DEBUGLOG AGREGADO ✅

Se han agregado `console.debug()` exhaustivos en todos los puntos críticos del control panel.

## Qué buscar en la consola de desarrollo (F12)

### 1. AL CARGAR LA PÁGINA (Espacio tab)
Deberías ver:
```
[OSDetailsLayout] Layout mounted/updated: {osId: "2025-12345", pathname: "/os/2025-12345/control-panel"}
[OsPanelPage] Rendered with: {osId: "2025-12345", activeTab: "espacio", searchParams: "tab=espacio", url: "http://localhost:3001/os/2025-12345/control-panel?tab=espacio"}
```

**PROBLEMA SI VES**: UUID en lugar de numero_expediente (ej: "8935afe1-48bc-...")

---

### 2. AL PULSAR UNA PESTAÑA (ej: "Sala")
Deberías ver EN ORDEN:
```
[OsPanelTabs] handleTabChange triggered: {newTab: "sala", currentTab: "espacio", timestamp: "2026-01-15T..."}
[OsPanelTabs] router.push called: {newUrl: "?tab=sala", searchParams: "tab=sala"}
[OsPanelTabs] Tab change completed
[OsPanelPage] Rendered with: {osId: "2025-12345", activeTab: "sala", searchParams: "tab=sala", ...}
```

**PROBLEMA SI VES**: 
- No ves los mensajes → router.push no se ejecuta
- activeTab sigue siendo "espacio" → searchParams no se actualizó
- UUID en osId → está llegando UUID en lugar de numero_expediente

---

### 3. AL PULSAR "HISTORIAL"
Deberías ver:
```
[OsPanelPage] Historial button clicked {osId: "2025-12345"}
[HistorialModal] Modal state changed: {isOpen: true, cambiosCount: X, isLoading: false, timestamp: "..."}
[useOsPanelHistory] Query function called: {osId: "2025-12345"}
[useOsPanelHistory] Resolved osId to targetId: {osId: "2025-12345", targetId: "UUID-aqui"}
[useOsPanelHistory] Query result: {resultCount: N, totalCount: N, error: null}
```

**PROBLEMAS SI VES**:
- No ves los mensajes de historial → botón no dispara click
- isOpen sigue siendo false → modal no se abre
- cambiosCount es 0 → tabla os_panel_cambios está vacía

---

### 4. AL PULSAR "EXPORTAR PDF"
Deberías ver:
```
[OsPanelPage] handleExport called: {osId: "2025-12345", osIdType: "string", osData_numero_expediente: "2025-12345"}
[OsPanelPage] Fetching export: {exportUrl: "/api/os/panel/export?osId=2025-12345"}
[export/route] Request received: {osId: "2025-12345", url: "http://localhost:3001/api/os/panel/export?osId=2025-12345"}
[export/route] Resolving osId: {osId: "2025-12345"}
[export/route] Resolved to: {targetId: "UUID-aqui"}
[export/route] Supabase query result: {found: true, error: null, numero_expediente: "2025-12345"}
[OsPanelPage] Export response status: {status: 200}
[OsPanelPage] Blob received: {size: XXXX, type: "application/pdf"}
[OsPanelPage] Export completed successfully
```

**PROBLEMAS SI VES**:
- No ves los logs → fetch no se inicia
- status: 404/500 → error en API
- status: 200 pero Blob vacio → problema generando PDF
- No se descarga automáticamente → fallo en URL.createObjectURL

---

## Cómo acceder a la consola

### Chrome/Edge/Firefox
1. Presiona **F12** (o Cmd+Option+I en Mac)
2. Abre la pestaña **Console**
3. Filtra por "OsPanel" o "[" para ver solo nuestros logs

### En Firefox
Consola → Configuración → Mostrar timestamps (recomendado)

---

## Checklist de validación

- [ ] URLs usan `numero_expediente`, no UUID
- [ ] Al cambiar pestañas, ves `router.push called`
- [ ] Después de router.push, activeTab se actualiza en el siguiente log
- [ ] Historial modal se abre al pulsar botón
- [ ] Export PDF descarga archivo PDF válido
- [ ] No hay errores en rojo en consola

---

## Qué significan los logs

| Prefijo | Significado |
|---------|------------|
| `[OsPanelPage]` | Componente principal de página |
| `[OsPanelTabs]` | Componente de pestañas |
| `[HistorialModal]` | Modal de historial de cambios |
| `[useOsPanelHistory]` | Hook que fetch historial |
| `[export/route]` | API endpoint de export |
| `[OSDetailsLayout]` | Layout de raíz |

---

## Si nada funciona...

1. **Abre consola (F12)**
2. **Copiar todos los logs** que ves
3. **Compartir logs** conmigo para diagnóstico exacto

Los logs dirán exactamente dónde falla el flujo. 🔍
