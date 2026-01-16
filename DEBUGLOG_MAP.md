# Mapa Visual de Debuglogs - OS Control Panel

## 🗺️ Flujo Completo con Debuglogs

```
┌─────────────────────────────────────────────────────────────────┐
│                    CARGAR PÁGINA                                │
└─────────────────────────────────────────────────────────────────┘

URL: http://localhost:3001/os/2025-12345/control-panel?tab=espacio

              ↓
    ┌─────────────────────┐
    │  layout.tsx         │
    │  (OSDetailsLayout)  │
    └─────────────────────┘
              ↓
    [OSDetailsLayout] Layout mounted/updated: {
      osId: "2025-12345",
      pathname: "/os/2025-12345/control-panel"
    }
              ↓
    ┌─────────────────────┐
    │  page.tsx           │
    │  (OsPanelPage)      │
    └─────────────────────┘
              ↓
    [OsPanelPage] Rendered with: {
      osId: "2025-12345",
      activeTab: "espacio",
      searchParams: "tab=espacio",
      url: "http://localhost:3001/os/..."
    }
              ↓
    ┌─────────────────────┐
    │  Verifica si        │
    │  osId === UUID?     │
    └─────────────────────┘
              ├─ SI: UUID detectado
              │  [OsPanelPage] URL normalization triggered: {
              │    currentOsId: "8935afe1...",
              │    canonicalId: "2025-12345",
              │    isDifferent: true
              │  }
              │  [OsPanelPage] router.replace called: {
              │    newUrl: "/os/2025-12345/control-panel?tab=espacio"
              │  }
              │
              └─ NO: ya es numero_expediente ✓

              ↓
    Renderiza componentes


═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                AL PULSAR PESTAÑA (ej: "Sala")                   │
└─────────────────────────────────────────────────────────────────┘

User: click en botón "Sala"

    ┌─────────────────────┐
    │  OsPanelTabs.tsx    │
    │  onClick handler    │
    └─────────────────────┘
              ↓
    [OsPanelTabs] handleTabChange triggered: {
      newTab: "sala",
      currentTab: "espacio",
      timestamp: "2026-01-15T10:30:45.123Z"
    }
              ↓
    Crear URLSearchParams y setear tab=sala
              ↓
    [OsPanelTabs] router.push called: {
      newUrl: "?tab=sala",
      searchParams: "tab=sala"
    }
              ↓
    router.push("?tab=sala")
              ↓
    [OsPanelTabs] Tab change completed
              ↓
    window.scrollTo({ top: 0, behavior: 'instant' })

    ═══════════════════════════════════════════════════════════

    NAVEGADOR ACTUALIZA URL Y RE-RENDERIZA COMPONENTE

    ═══════════════════════════════════════════════════════════

              ↓
    URL ahora: http://localhost:3001/os/2025-12345/control-panel?tab=sala

              ↓
    [OsPanelPage] Rendered with: {
      osId: "2025-12345",
      activeTab: "sala",  ← CAMBIÓ!
      searchParams: "tab=sala",
      url: "http://localhost:3001/os/2025-12345/control-panel?tab=sala"
    }
              ↓
    Renderiza componente SalaTab


═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│            AL PULSAR BOTÓN "HISTORIAL" (🕐)                    │
└─────────────────────────────────────────────────────────────────┘

User: click en botón histórico

    ┌──────────────────────────┐
    │  OsPanelHeader.tsx       │
    │  onHistorialClick()      │
    └──────────────────────────┘
              ↓
    [OsPanelPage] Historial button clicked {
      osId: "2025-12345"
    }
              ↓
    setIsHistorialOpen(true)

    ═══════════════════════════════════════════════════════════

    RE-RENDERIZA CON isHistorialOpen=true

    ═══════════════════════════════════════════════════════════

              ↓
    [HistorialModal] Modal state changed: {
      isOpen: true,
      cambiosCount: 5,
      isLoading: false,
      timestamp: "2026-01-15T10:31:20.456Z"
    }
              ↓
    Monta HistorialModal con isOpen={true}
              ↓
    Dispara hook useOsPanelHistory(osId)

              ↓
    [useOsPanelHistory] Query function called: {
      osId: "2025-12345"
    }
              ↓
    Llama resolveOsId("2025-12345") → "UUID"

              ↓
    [useOsPanelHistory] Resolved osId to targetId: {
      osId: "2025-12345",
      targetId: "8935afe1-48bc-4669-b5c3-a6c4135fcac5"
    }
              ↓
    Ejecuta query Supabase:
    SELECT * FROM os_panel_cambios WHERE os_id = targetId

              ↓
    [useOsPanelHistory] Query result: {
      resultCount: 5,
      totalCount: 5,
      error: null
    }
              ↓
    Modal se muestra con cambios


═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│          AL PULSAR BOTÓN "EXPORTAR PDF" (📄)                   │
└─────────────────────────────────────────────────────────────────┘

User: click en botón exportar

    ┌──────────────────────────┐
    │  OsPanelHeader.tsx       │
    │  onExportClick()         │
    └──────────────────────────┘
              ↓
    handleExport()

              ↓
    [OsPanelPage] handleExport called: {
      osId: "2025-12345",
      osIdType: "string",
      osData_numero_expediente: "2025-12345"
    }
              ↓
    Construye URL de fetch

              ↓
    [OsPanelPage] Fetching export: {
      exportUrl: "/api/os/panel/export?osId=2025-12345"
    }
              ↓
    fetch("/api/os/panel/export?osId=2025-12345")

    ═══════════════════════════════════════════════════════════

    SERVIDOR: app/api/os/panel/export/route.ts

    ═══════════════════════════════════════════════════════════

              ↓
    [export/route] Request received: {
      osId: "2025-12345",
      url: "http://localhost:3001/api/os/panel/export?osId=2025-12345"
    }
              ↓
    Valida osId

              ↓
    [export/route] Resolving osId: {
      osId: "2025-12345"
    }
              ↓
    const targetId = await resolveOsId("2025-12345")
    // → "8935afe1-48bc-4669-b5c3-a6c4135fcac5"

              ↓
    [export/route] Resolved to: {
      targetId: "8935afe1-48bc-4669-b5c3-a6c4135fcac5"
    }
              ↓
    Ejecuta query Supabase:
    SELECT * FROM eventos WHERE id = targetId

              ↓
    [export/route] Supabase query result: {
      found: true,
      error: null,
      numero_expediente: "2025-12345"
    }
              ↓
    Llama generateOsPanelPDF(osData)
    (genera documento PDF)

              ↓
    Retorna PDF como binary con headers:
    Content-Type: application/pdf
    Content-Disposition: attachment; filename="OS-2025-12345-2026-01-15.pdf"

    ═══════════════════════════════════════════════════════════

    CLIENTE RECIBE RESPUESTA

    ═══════════════════════════════════════════════════════════

              ↓
    [OsPanelPage] Export response status: {
      status: 200
    }
              ↓
    const blob = await response.blob()

              ↓
    [OsPanelPage] Blob received: {
      size: 45632,
      type: "application/pdf"
    }
              ↓
    URL.createObjectURL(blob)
    Crea <a> element con href=blob
    Simula click para descargar

              ↓
    [OsPanelPage] Export completed successfully
              ↓
    Limpia references
              ↓
    Archivo descargado: OS-2025-12345-2026-01-15.pdf ✓


═══════════════════════════════════════════════════════════════════
```

## 🔴 Puntos de Fallo Posibles

### 1️⃣ Tab Navigation
```
❌ FALLA EN:              │ EVIDENCIA EN LOGS
────────────────────────────────────────────────────────────────
router.push no se ejecuta │ NO ves [OsPanelTabs] router.push called
searchParams no actualiza │ activeTab sigue siendo "espacio"
component no re-renderiza │ NO ves [OsPanelPage] Rendered con tab actualizado
UUID persiste             │ osId sigue siendo UUID en lugar de numero_expediente
```

### 2️⃣ Historial Modal
```
❌ FALLA EN:              │ EVIDENCIA EN LOGS
────────────────────────────────────────────────────────────────
Click no se ejecuta      │ NO ves [OsPanelPage] Historial button clicked
Modal no se abre         │ [HistorialModal] isOpen sigue siendo false
Query no se ejecuta      │ NO ves [useOsPanelHistory] Query function called
Supabase retorna vacío   │ resultCount: 0
```

### 3️⃣ PDF Export
```
❌ FALLA EN:              │ EVIDENCIA EN LOGS
────────────────────────────────────────────────────────────────
Click no se ejecuta      │ NO ves [OsPanelPage] handleExport called
Fetch no se envía        │ NO ves [OsPanelPage] Fetching export
API retorna error        │ status: 404 o 500
Supabase no encuentra OS │ found: false
PDF generator falla      │ NO ves Blob received
Descarga no inicia       │ Todos los logs OK pero nada descarga
```

## ✅ Diagnóstico: Lo que Debes Ver

| Acción | Lo que ves | Estado |
|--------|-----------|--------|
| Cargas página | 2 logs de render | ✅ OK |
| Cambias tab | 3-4 logs seguidos | ✅ OK |
| Abres historial | 4 logs seguidos | ✅ OK |
| Exportas PDF | 7-8 logs seguidos | ✅ OK |
| **NUNCA ves UUID** | Todos logs con numero_expediente | ✅ OK |

Si algo no sale → Ahí está el problema. 🎯
