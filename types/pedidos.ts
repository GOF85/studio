// ============================================================================
// Types for Rental Order Management System (os_pedidos)
// ============================================================================

/**
 * PedidoItem: Individual line item in a rental order
 * Note: Different from CateringItem used in order management
 */
export type PedidoItem = {
  id?: string;
  materialOrderId?: string; // ← Reference to original OrderItem (materialOrderId)
  itemCode: string;
  description: string;
  cantidad: number; // Quantity ordered
  dias?: number; // Days for rental (default: 1)
  price?: number;
  priceSnapshot?: number; // ← Price at the time of creating the order
  stock?: number;
  imageUrl?: string;
  subcategoria?: string; // ← Category badge
  category?: string;
  tipo?: string;
  unidadVenta?: string;
  solicita?: 'Sala' | 'Cocina'; // ← Context of this item
};

/**
 * PedidoPendiente: Rental order waiting to be sent to provider
 * Represents a single combination of (fecha_entrega, localizacion, solicita, proveedor)
 */
export type PedidoPendiente = {
  id: string;
  os_id: string; // numero_expediente
  tipo: 'Alquiler';
  estado: 'Pendiente';
  status?: 'pending' | 'review' | 'confirmed' | 'sent' | 'cancelled'; // New: Track sub-pedido status
  fecha_entrega: string; // YYYY-MM-DD
  hora_entrega: string; // HH:MM (Required, validated 8:00-22:00)
  localizacion: string;
  solicita: 'Sala' | 'Cocina';
  proveedor_id?: string; // ← Link to provider for "agregar referencias"
  items: PedidoItem[];
  cantidad_articulos: number;
  cantidad_unidades: number;
  // Pickup information
  fecha_recogida?: string; // YYYY-MM-DD (Optional)
  hora_recogida?: string; // HH:MM (Optional)
  lugar_recogida?: 'Evento' | 'Instalaciones'; // Where material is picked up
  created_at: string;
  updated_at: string;
  created_by?: string;
};

/**
 * PedidoEnviado: Consolidated order sent to provider
 * Can consolidate multiple pending orders
 * Items are consolidated by (fecha, localizacion), ignoring solicita
 */
export type PedidoEnviado = {
  id: string;
  os_id: string; // numero_expediente
  tipo: 'Alquiler';
  estado: 'En preparación' | 'Listo';
  numero_pedido?: string; // Sequential order number like A0001
  fecha_entrega: string; // YYYY-MM-DD
  hora_entrega?: string; // HH:MM (NEW)
  localizacion: string;
  items: PedidoItem[];
  
  // User comment
  comentario_pedido?: string;
  
  // Event information for provider
  numero_expediente: string;
  nombre_espacio: string;
  direccion_espacio: string;
  responsable_metre?: string;
  telefono_metre?: string;
  responsable_pase?: string;
  telefono_pase?: string;
  
  // NEW: Pickup information
  fecha_recogida?: string; // YYYY-MM-DD
  hora_recogida?: string; // HH:MM
  lugar_recogida?: 'Evento' | 'Instalaciones';
  
  // Consolidation metadata
  fecha_consolidacion: string;
  fecha_envio_pdf?: string;
  usuario_genero_pdf?: string;
  pedidos_pendientes_ids: string[]; // UUIDs of original pending orders
  
  created_at: string;
  updated_at: string;
};

/**
 * ConsolidatedGroup: Items grouped by (fecha, localizacion, proveedor)
 * Used for PDF generation and display
 * NOTE: Ignores solicita - consolidates Sala + Cocina together
 */
export type ConsolidatedGroup = {
  fecha_entrega: string;
  hora_entrega?: string; // NEW: Hora de entrega (HH:MM)
  localizacion: string;
  proveedor_id?: string;
  proveedor?: string; // Provider name (nombre_comercial)
  items: PedidoItem[];
  // NEW: Pickup information
  fecha_recogida?: string; // YYYY-MM-DD
  hora_recogida?: string; // HH:MM
  lugar_recogida?: 'Evento' | 'Instalaciones';
};

/**
 * PedidosPorFecha: Grouped view of pending orders by delivery date
 */
export type PedidosPorFecha = {
  fecha: string;
  pedidos: PedidoPendiente[];
};

/**
 * API Response types
 */
/**
 * API Response types
 */
export type CreatePedidoPendienteRequest = {
  osId: string;
  fechaEntrega: string;
  horaEntrega: string; // HH:MM (Required)
  localizacion: string;
  solicita: 'Sala' | 'Cocina';
  proveedor_id?: string; // ← Optional on creation, can be set later
  nombreComercialProveedor?: string; // Provider name for PDF
  fechaRecogida?: string; // YYYY-MM-DD (Optional)
  horaRecogida?: string; // HH:MM (Optional)
  lugarRecogida?: 'Evento' | 'Instalaciones'; // (Optional)
  items: PedidoItem[];
  createdBy?: string; // ← Removed from Supabase insert
};

export type UpdatePedidoPendienteRequest = {
  pedidoId: string;
  items: PedidoItem[];
};

export type MoveItemsRequest = {
  sourceOsId: string;
  destOsId: string;
  itemsToMove: PedidoItem[];
  sourceContext: {
    fechaEntrega: string;
    localizacion: string;
    solicita: 'Sala' | 'Cocina';
  };
  destContext?: {
    fechaEntrega: string;
    localizacion: string;
    solicita: 'Sala' | 'Cocina';
  };
};

export type GeneratePDFRequest = {
  osId: string;
  selectedPedidoIds: string[];
  generatedBy: string;
  comentario?: string;
};

export type GeneratePDFResponse = {
  osId: string;
  pdfUrl: string;
  pedidoEnviadoId: string;
  consolidatedCount: number;
  totalItems: number;
  totalUnidades: number;
};

/**
 * Summary information for a pending order
 */
export type PedidoSummary = {
  id: string;
  fecha_entrega: string;
  localización: string;
  solicita: 'Sala' | 'Cocina';
  articulos: number;
  unidades: number;
};

/**
 * ConsolidationPreview: Preview of how pending orders will be consolidated
 * Grouped by (fecha, localización, proveedor)
 */
export type ConsolidationPreview = {
  proveedor_id?: string;
  fecha_entrega: string;
  localizacion: string;
  items: PedidoItem[];
  subPedidoIds: string[]; // Which pending orders contribute to this group
};

/**
 * Request to update a pending order with new fecha/localizacion/solicita
 */
export type UpdatePedidoContextRequest = {
  pedidoId: string;
  fechaEntrega?: string;
  horaEntrega?: string; // HH:MM
  localizacion?: string;
  solicita?: 'Sala' | 'Cocina';
  fechaRecogida?: string; // YYYY-MM-DD
  horaRecogida?: string; // HH:MM
  lugarRecogida?: 'Evento' | 'Instalaciones';
};

/**
 * Request to add items from a provider to a pending order
 * Auto-sums duplicate items
 */
export type AddItemsRequest = {
  pedidoId: string;
  newItems: PedidoItem[];
};
