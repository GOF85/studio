/**
 * Utilities for order consolidation and PDF generation
 */

import { PedidoPendiente, PedidoItem, ConsolidatedGroup } from '@/types/pedidos';

/**
 * Consolidate multiple pending orders by (fecha_entrega, localización)
 * Merge items across all solicita contexts
 * @param pedidos - Array of pending orders
 * @returns Consolidated groups ready for PDF generation
 */
export function consolidatePedidos(
  pedidos: PedidoPendiente[]
): ConsolidatedGroup[] {
  // Group by fecha + localizacion
  const grouped: Record<
    string,
    {
      fecha_entrega: string;
      localizacion: string;
      items: Map<string, PedidoItem>;
    }
  > = {};

  for (const pedido of pedidos) {
    const key = `${pedido.fecha_entrega}|${pedido.localizacion}`;

    if (!grouped[key]) {
      grouped[key] = {
        fecha_entrega: pedido.fecha_entrega,
        localizacion: pedido.localizacion,
        items: new Map(),
      };
    }

    // Merge items (sum quantities by itemCode)
    for (const item of pedido.items) {
      const itemKey = item.itemCode;
      const existingItem = grouped[key].items.get(itemKey);

      if (existingItem) {
        // Add to existing item - sum the quantities
        grouped[key].items.set(itemKey, {
          ...existingItem,
          cantidad: (existingItem.cantidad || 0) + (item.cantidad || 0),
        });
      } else {
        // Create new item entry
        grouped[key].items.set(itemKey, item);
      }
    }
  }

  // Convert to array and sort
  return Object.values(grouped)
    .map((group) => ({
      fecha_entrega: group.fecha_entrega,
      localizacion: group.localizacion,
      items: Array.from(group.items.values()),
    }))
    .sort((a, b) => {
      const dateCompare = a.fecha_entrega.localeCompare(b.fecha_entrega);
      if (dateCompare !== 0) return dateCompare;
      return a.localizacion.localeCompare(b.localizacion);
    });
}

/**
 * Calculate total items and units from consolidated group
 */
export function calculateConsolidatedStats(groups: ConsolidatedGroup[]): {
  totalArticulos: number;
  totalUnidades: number;
} {
  let totalArticulos = 0;
  let totalUnidades = 0;

  for (const group of groups) {
    totalArticulos += group.items.length;
    totalUnidades += group.items.reduce(
      (sum, item) => sum + (item.cantidad || 0),
      0
    );
  }

  return {
    totalArticulos,
    totalUnidades,
  };
}

/**
 * Format consolidated group for display
 */
export function formatConsolidatedGroup(group: ConsolidatedGroup): string {
  const fecha = new Date(group.fecha_entrega).toLocaleDateString('es-ES');
  const articulos = group.items.length;
  const unidades = group.items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  return `${fecha} • ${group.localizacion} (${articulos} artículos, ${Math.round(unidades)} unidades)`;
}

/**
 * Validate pedidos for consolidation
 * @returns Error message if validation fails, null otherwise
 */
export function validatePedidosForConsolidation(
  pedidos: PedidoPendiente[]
): string | null {
  if (pedidos.length === 0) {
    return 'No hay pedidos seleccionados';
  }

  if (pedidos.length === 1) {
    // Single pedido is OK, but inform user
    return null;
  }

  // Check if all pedidos have items
  const emptyPedidos = pedidos.filter((p) => p.items.length === 0);
  if (emptyPedidos.length > 0) {
    return `${emptyPedidos.length} pedido(s) no tiene(n) artículos`;
  }

  return null;
}

/**
 * Generate PDF filename for consolidated orders
 */
export function generatePDFFilename(
  osId: string,
  fecha: string,
  localizacion: string
): string {
  const sanitizedLoc = localizacion.replace(/\s+/g, '-').toLowerCase();
  return `pedidos-${osId}-${fecha}-${sanitizedLoc}.pdf`;
}
