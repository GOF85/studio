/**
 * PDF Generation utilities for rental orders
 * Uses jsPDF library for document creation
 */

import { jsPDF } from 'jspdf';
// Import with side effects to register plugin
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { ConsolidatedGroup, PedidoEnviado } from '@/types/pedidos';
import { formatDate } from '@/lib/utils';

// Ensure autoTable is available
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface PDFGenerationOptions {
  osNumber?: string;
  eventName?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  comments?: string;
}

/**
 * Generate PDF document for consolidated rental orders
 * @param groups - Consolidated order groups
 * @param options - PDF options
 * @returns PDF document URL or blob
 */
export function generatePedidoPDF(
  groups: ConsolidatedGroup[],
  options: PDFGenerationOptions = {}
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function for new page
  const addNewPage = () => {
    doc.addPage();
    yPosition = margin;
  };

  // Header
  doc.setFontSize(16);
  doc.text('PEDIDO DE ALQUILER', margin, yPosition);
  yPosition += 10;

  // Event info
  doc.setFontSize(10);
  if (options.osNumber) {
    doc.text(`Referencia: ${options.osNumber}`, margin, yPosition);
    yPosition += 5;
  }
  if (options.eventName) {
    doc.text(`Evento: ${options.eventName}`, margin, yPosition);
    yPosition += 5;
  }

  doc.text(`Fecha de generación: ${formatDate(new Date())}`, margin, yPosition);
  yPosition += 8;

  // Provider info if available
  if (options.providerName) {
    doc.setFontSize(9);
    doc.text('PROVEEDOR:', margin, yPosition);
    yPosition += 4;
    doc.text(options.providerName, margin + 2, yPosition);
    yPosition += 3;
    if (options.providerPhone) {
      doc.text(`Teléfono: ${options.providerPhone}`, margin + 2, yPosition);
      yPosition += 3;
    }
    if (options.providerEmail) {
      doc.text(`Email: ${options.providerEmail}`, margin + 2, yPosition);
      yPosition += 3;
    }
    yPosition += 3;
  }

  // Process each consolidated group
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];

    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      addNewPage();
    }

    // Group header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${formatDate(group.fecha_entrega)} • ${(group as any).hora_entrega || 'N/A'} • ${group.localizacion}`,
      margin,
      yPosition
    );
    yPosition += 6;

    // Pickup info if available (NEW)
    if ((group as any).fecha_recogida) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const recogidaText = `Recogida: ${formatDate((group as any).fecha_recogida)} ${(group as any).hora_recogida ? `a las ${(group as any).hora_recogida}` : ''} en ${(group as any).lugar_recogida || 'N/A'}`;
      doc.text(recogidaText, margin, yPosition);
      yPosition += 4;
      doc.setTextColor(0, 0, 0);
    }

    // Items list (manual rendering without autoTable)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Draw header row manually
    doc.setFillColor(66, 133, 244);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = {
      code: 25,
      desc: 80,
      qty: 25,
      unit: 25,
    };
    const rowHeight = 6;

    // Header
    doc.rect(margin, yPosition, colWidths.code, rowHeight, 'F');
    doc.text('Código', margin + 1, yPosition + 4);
    
    doc.rect(margin + colWidths.code, yPosition, colWidths.desc, rowHeight, 'F');
    doc.text('Descripción', margin + colWidths.code + 1, yPosition + 4);
    
    doc.rect(margin + colWidths.code + colWidths.desc, yPosition, colWidths.qty, rowHeight, 'F');
    doc.text('Cant.', margin + colWidths.code + colWidths.desc + 1, yPosition + 4);
    
    doc.rect(margin + colWidths.code + colWidths.desc + colWidths.qty, yPosition, colWidths.unit, rowHeight, 'F');
    doc.text('Unidad', margin + colWidths.code + colWidths.desc + colWidths.qty + 1, yPosition + 4);

    yPosition += rowHeight;

    // Data rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    group.items.forEach((item) => {
      if (yPosition > pageHeight - 20) {
        addNewPage();
      }

      doc.text(item.itemCode || '-', margin + 1, yPosition + 4);
      doc.text(
        (item.description || '-').substring(0, 40),
        margin + colWidths.code + 1,
        yPosition + 4
      );
      doc.text((item.cantidad || 0).toString(), margin + colWidths.code + colWidths.desc + 1, yPosition + 4);
      doc.text(item.unidadVenta || 'ud', margin + colWidths.code + colWidths.desc + colWidths.qty + 1, yPosition + 4);

      yPosition += rowHeight;
    });

    yPosition += 4;

    // Summary for group
    const totalArticulos = group.items.length;
    const totalUnidades = group.items.reduce(
      (sum, item) => sum + (item.cantidad || 0),
      0
    );

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Total: ${totalArticulos} artículos • ${Math.round(totalUnidades)} unidades`,
      margin,
      yPosition
    );
    yPosition += 5;

    // Separator
    doc.setDrawColor(200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  }

  // Footer with comments if any
  if (options.comments) {
    if (yPosition > pageHeight - 40) {
      addNewPage();
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', margin, yPosition);
    yPosition += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitText = doc.splitTextToSize(options.comments, contentWidth);
    doc.text(splitText, margin, yPosition);
  }

  return doc;
}

/**
 * Generate PDF and download to browser
 */
export function downloadPedidoPDF(
  doc: jsPDF,
  filename: string = 'pedidos.pdf'
): void {
  doc.save(filename);
}

/**
 * Generate PDF as blob
 */
export async function getPedidoPDFBlob(doc: jsPDF): Promise<Blob> {
  return doc.output('blob');
}

/**
 * Generate PDF URL for download
 */
export function getPedidoPDFDataURL(doc: jsPDF): string {
  return doc.output('dataurlstring');
}
