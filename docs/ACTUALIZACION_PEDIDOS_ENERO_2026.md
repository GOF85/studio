# Guía de Actualización: Edición de Pedidos y Splash Screen (15 Enero 2026)

## Resumen General
Se ha implementado un sistema completo de edición de pedidos enviados con información de entrega/recogida mejorada, splash screen para generación de PDFs y logging de cambios.

## Cambios Implementados

### 1. **Splash Screen de Generación de PDF**
**Archivo:** `/components/pedidos/pdf-generation-splash.tsx`
- Animación profesional con progreso
- Mensajes contextuales
- Indicador de tiempo estimado
- Integración con el sistema de generación de PDFs

**Uso en:**
- Al generar PDF de pedidos consolidados
- Al enviar pedidos (consolidación)

### 2. **Modal de Edición de Pedidos Enviados**
**Archivo:** `/components/pedidos/modals/editable-sent-order-details-modal.tsx`
- Edición completa de datos de entrega y recogida
- Edición de items (cantidad, eliminación)
- Información de responsables (Maître, Pase)
- Expandible/colapsable por secciones
- Estados y cálculos actualizados en tiempo real

**Características:**
- Visualización clara de dirección de evento
- Dirección de recogida: automática desde lugar (Evento o Instalaciones)
- Directorio hardcodeado para Instalaciones: "Polígono Industrial Santa Cruz, Nave 7, 28160 Torrejón de Ardoz, Madrid"

### 3. **Sistema de Logging de Cambios**
**Archivo:** `/lib/pedido-logs.ts`
- Detecta cambios automáticamente
- Registra usuario, email, timestamp
- Rastreo del tipo de cambio
- Permite auditoría completa

**Tabla Supabase:** `os_pedidos_change_log`
- Creada automáticamente mediante migración

### 4. **Tarjeta de Pedidos Consolidados Mejorada**
**Ubicación:** Alquiler > Pedidos Consolidados y Enviados

**Mostrará:**
- ✅ Número de Pedido
- ✅ Estado del pedido (Listo/En preparación)
- ✅ Total de valor
- ✅ Fecha y hora de entrega
- ✅ Ubicación de entrega
- ✅ Dirección del evento
- ✅ Fecha, hora y lugar de recogida (si aplica)
- ✅ Resumen de artículos

**Botones:**
- ⬇️ Descargar PDF
- 📝 Ver & Editar (abre modal editable)
- 🗑️ Eliminar (solo si fue anulado)

### 5. **API Endpoints**

#### POST `/api/pedidos/log-change`
```typescript
{
  pedido_id: string,
  os_id: string,
  usuario_id: string,
  usuario_email?: string,
  tipo_cambio: 'entrega' | 'recogida' | 'items' | 'completo',
  cambios: Array<{
    campo: string,
    valor_anterior: any,
    valor_nuevo: any
  }>,
  razon?: string
}
```

#### PATCH `/api/pedidos/update-enviado`
```typescript
{
  pedidoId: string,
  osId: string,
  updates: Partial<PedidoEnviado>,
  editedBy?: string
}
```

## Cambios en Alquiler/Page.tsx

### Imports Agregados
```typescript
import { Clock } from 'lucide-react' // Nuevo icono
import { EditableSentOrderDetailsModal } from '@/components/pedidos/modals'
import { PDFGenerationSplash } from '@/components/pedidos/pdf-generation-splash'
import { logPedidoChange, detectarCambios } from '@/lib/pedido-logs'
```

### Interfaces Actualizadas
```typescript
interface ModalState {
  // ... existentes ...
  editEnviadoDetails: boolean // ← NUEVO
}

interface SelectedData {
  // ... existentes ...
  editEnviadoPedido: PedidoEnviado | null // ← NUEVO
}
```

### Estados Agregados
```typescript
const [pdfGenerationProgress, setPdfGenerationProgress] = useState(0) // ← NUEVO
const [showPdfSplash, setShowPdfSplash] = useState(false) // ← NUEVO
```

### Handlers Agregados
```typescript
// Nuevo handler para guardar cambios en pedido enviado
const handleSaveEnviadoPedido = async (updates: Partial<PedidoEnviado>) => {
  // - Detecta cambios
  // - Registra en log
  // - Llama al API de actualización
  // - Refetch de datos
}
```

### Handlers Mejorados
```typescript
// handleConfirmGeneratePDF - Agregó splash screen con progreso
// handleConfirmEnviarPedidos - Agregó splash screen con progreso
```

## Configuración en Supabase

### Tabla Requerida: `os_pedidos_change_log`
```sql
CREATE TABLE os_pedidos_change_log (
  id UUID PRIMARY KEY,
  pedido_id UUID,
  os_id VARCHAR(255),
  usuario_id UUID,
  usuario_email VARCHAR(255),
  tipo_cambio VARCHAR(50),
  cambios JSONB,
  razon TEXT,
  timestamp TIMESTAMP
);
```

**Ejecutar la migración:**
```bash
# Copiar contenido de migrations/001_create_pedidos_change_log.sql
# Ir a Supabase Dashboard > SQL Editor
# Pegar y ejecutar
```

## Testing Manual

### Escenario 1: Editar Datos de Entrega
1. Ir a Alquiler > Pedidos Consolidados
2. Click en "Ver & Editar"
3. Cambiar fecha/hora/ubicación
4. Click "Guardar Cambios"
5. Verificar splash screen aparece
6. Verificar entrada en `os_pedidos_change_log`

### Escenario 2: Generar PDF
1. Ir a Alquiler > Gestión de Sub-Pedidos
2. Crear un sub-pedido
3. Agregar items
4. Click "Enviar Sub-Pedidos"
5. Verificar splash screen con progreso

### Escenario 3: Cambios Rápidos
1. Editar pedido
2. Cambiar múltiples campos
3. Guardar
4. Log debe mostrar todos los cambios

## Performance

- **Splash Screen**: No bloquea UI, es puramente visual
- **Logging**: Asíncrono, no bloquea la operación principal
- **Detección de Cambios**: Usa comparación simple, muy rápido
- **Modal**: Lazy loading de componentes, sin impacto en performance

## Dirección Hardcodeada

Para recogidas en "Instalaciones", se usa:
```
Polígono Industrial Santa Cruz, Nave 7, 28160 Torrejón de Ardoz, Madrid
```

Si necesitas cambiarla, busca esta cadena en:
- `/components/pedidos/modals/editable-sent-order-details-modal.tsx`
- Línea con `INSTALACIONES_ADDRESS`

## Errores Comunes y Soluciones

### "No se pudo guardar"
- Verificar que la tabla `os_pedidos_enviados` existe
- Verificar permisos en Supabase RLS

### Splash no desaparece
- Revisar console.log de errores en red
- Puede ser timeout en generación de PDF

### Cambios no se guardan
- Verificar tabla `os_pedidos_change_log` existe
- Los cambios se guardan incluso sin tabla (graceful fallback)

## Future Improvements

1. Agregar historial completo de cambios en modal
2. Revert de cambios anteriores
3. Notificaciones a usuarios sobre cambios
4. Export de logs en Excel
5. Dashboard de auditoría
