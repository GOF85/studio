/**
 * PDF Generation utilities for rental orders - COMPLETE REWRITE
 * Uses jsPDF library for document creation
 */

import { jsPDF } from 'jspdf';
import { ConsolidatedGroup, PedidoEnviado } from '@/types/pedidos';
import { formatDate, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Try to load jspdf-autotable but don't fail if it doesn't load
try {
  require('jspdf-autotable');
} catch (e) {
  console.warn('[PDF Generator] jspdf-autotable not available, using manual table generation');
}

interface PDFGenerationOptions {
  numeroPedido?: string;
  osNumber?: string;
  nombreComercialProveedor?: string;  // Provider name for header
  eventName?: string;
  eventSpace?: string;
  eventAddress?: string;
  lugarRecogida?: 'Evento' | 'Instalaciones';  // For determining pickup address
  direccionRecogida?: string;  // Pickup address (event or warehouse)
  responsableMetre?: string;
  telefonoMetre?: string;
  responsablePase?: string;
  telefonoPase?: string;
  comments?: string;
  dias?: number;
  includeImages?: boolean;
  logoUrl?: string;  // URL to logo for header
}

/**
 * Convert image URL to Base64 string
 * Timeout: 5 seconds per image to avoid slow PDFs
 */
async function urlToBase64(imageUrl: string, timeoutMs: number = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'image/*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[PDF] Failed to fetch image: ${response.status} ${imageUrl}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine image type from URL or content-type
    const contentType = response.headers.get('content-type') || 'image/webp';
    const mimeType = contentType.includes('webp') ? 'image/webp' :
                     contentType.includes('png') ? 'image/png' :
                     contentType.includes('jpeg') || contentType.includes('jpg') ? 'image/jpeg' : 'image/webp';

    return `data:${mimeType};base64,${base64}`;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[PDF] Image fetch timeout: ${imageUrl}`);
    } else {
      console.warn(`[PDF] Error fetching image: ${error.message}`);
    }
    return null;
  }
}

/**
 * Safe date formatter (DD/MM/YYYY)
 */
function safeFormatDate(dateStr: any): string {
  try {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch (e) {
    return 'N/A';
  }
}

/**
 * Safe time formatter (HH:mm from "HH:mm:ss")
 */
function safeFormatTime(timeStr: any): string {
  try {
    if (!timeStr) return 'N/A';
    if (typeof timeStr === 'string') {
      const parts = timeStr.split(':');
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : timeStr;
    }
    return 'N/A';
  } catch (e) {
    return 'N/A';
  }
}

/**
 * Draw manual table WITH headers and optional thumbnail images for PDF
 */
function drawManualTableWithHeaders(
  doc: jsPDF,
  tableData: Array<{ text: string[]; image?: string | null }>,
  startY: number,
  margin: number,
  pageWidth: number
): number {
  const colWidths = [20, 60, 15, 12, 25, 33];  // Image, Description, Qty, Days, Unit Price, Total - reduced to fit A4
  const cellHeight = 18;  // Increased for image height
  const headerHeight = 8;
  let yPosition = startY;

  // ===== DRAW HEADER ROW =====
  doc.setFillColor(34, 139, 34);  // Dark green background
  doc.setDrawColor(34, 139, 34);  // Dark green border
  doc.setLineWidth(0.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);  // Header font size
  doc.setTextColor(255, 255, 255);  // WHITE text on green background

  const headers = ['Imagen', 'Nombre Artículo', 'Cant.', 'Días', 'Precio Unit.', 'Total'];
  let xPosition = margin;

  for (let i = 0; i < headers.length; i++) {
    // Set green background for EACH cell
    doc.setFillColor(34, 139, 34);  // Dark green background
    doc.setDrawColor(34, 139, 34);  // Dark green border
    
    // Draw filled rectangle with border
    doc.rect(xPosition, yPosition, colWidths[i], headerHeight, 'FD');
    
    // Draw text - VERTICALLY CENTERED
    const headerText = headers[i];
    const headerLines = doc.splitTextToSize(headerText, colWidths[i] - 3);
    const textCenterY = yPosition + headerHeight / 2;
    
    // Ensure text color is white
    doc.setTextColor(255, 255, 255);
    doc.text(headerLines, xPosition + colWidths[i] / 2, textCenterY, { 
      align: 'center',
      baseline: 'middle',
      maxWidth: colWidths[i] - 2
    });
    
    xPosition += colWidths[i];
  }

  yPosition += headerHeight;

  // ===== DRAW DATA ROWS =====
  // CRITICAL: Reset text color BEFORE drawing data rows
  doc.setTextColor(0, 0, 0);  // Black text for data
  doc.setDrawColor(34, 139, 34);  // Keep green borders
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);  // Increased from 6
  doc.setLineWidth(0.3);

  for (const row of tableData) {
    xPosition = margin;
    
    // Column 0: Image (thumbnail)
    doc.rect(xPosition, yPosition, colWidths[0], cellHeight, 'S');
    
    if (row.image) {
      try {
        // Draw thumbnail image (15x15mm in a 25mm column)
        const imgSize = 14;
        const imgX = xPosition + (colWidths[0] - imgSize) / 2;
        const imgY = yPosition + (cellHeight - imgSize) / 2;  // Vertically centered
        doc.addImage(row.image, 'WEBP', imgX, imgY, imgSize, imgSize);
      } catch (e) {
        // If image fails, add placeholder
        doc.setTextColor(0, 0, 0);
        const textCenterY = yPosition + cellHeight / 2;
        doc.text('[Img]', xPosition + colWidths[0] / 2, textCenterY, { align: 'center', baseline: 'middle' });
      }
    } else {
      doc.setTextColor(0, 0, 0);
      const textCenterY = yPosition + cellHeight / 2;
      doc.text('-', xPosition + colWidths[0] / 2, textCenterY, { align: 'center', baseline: 'middle' });
    }
    xPosition += colWidths[0];

    // Column 1: Description + Category
    doc.setTextColor(0, 0, 0);
    doc.rect(xPosition, yPosition, colWidths[1], cellHeight, 'S');
    const description = row.text[0] || '-';
    const category = row.text[5] || '';  // Category is stored in row.text[5]
    const descLines = doc.splitTextToSize(description, colWidths[1] - 4);
    
    // Calculate total height needed
    const totalDescHeight = descLines.length * 2.5 + (category ? 3.5 : 0);
    let startY = yPosition + (cellHeight - totalDescHeight) / 2 + 2;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(descLines, xPosition + 2, startY, { maxWidth: colWidths[1] - 4, align: 'left' });
    
    if (category) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(category, xPosition + 2, startY + descLines.length * 2.5 + 1, { maxWidth: colWidths[1] - 4, align: 'left' });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    xPosition += colWidths[1];

    // Columns 2-5: Qty, Days, Unit Price, Total (numeric, right-aligned, VERTICALLY CENTERED)
    for (let i = 1; i < row.text.length - 1; i++) {  // -1 to skip category
      doc.setTextColor(0, 0, 0);
      doc.rect(xPosition, yPosition, colWidths[i + 1], cellHeight, 'S');
      const text = row.text[i] || '';
      const textX = xPosition + colWidths[i + 1] - 2;
      const textCenterY = yPosition + cellHeight / 2;
      doc.text(text, textX, textCenterY, { align: 'right', baseline: 'middle' });
      xPosition += colWidths[i + 1];
    }

    yPosition += cellHeight;
  }

  return yPosition;
}

/**
 * Generate PDF document for consolidated rental orders with full details and thumbnails
 * Now async to support image fetching
 */
export async function generatePedidoPDF(
  groups: ConsolidatedGroup[],
  options: PDFGenerationOptions = {}
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // ===== HEADER SECTION (COMPACT) =====
  // Load logo if provided
  console.log('[PDF] options.logoUrl exists?', !!options.logoUrl, '| value:', options.logoUrl);
  if (options.logoUrl) {
    try {
      console.log('[PDF] Attempting to load logo from:', options.logoUrl);
      const logoBase64 = await urlToBase64(options.logoUrl, 3000);
      console.log('[PDF] urlToBase64 returned:', logoBase64 ? `base64 string (${logoBase64.length} chars)` : 'NULL or empty');
      if (logoBase64) {
        console.log('[PDF] Logo loaded successfully, adding to PDF');
        // Logo: 220x40px real size, so in PDF at 72dpi ≈ 78x14mm
        const logoWidth = 45;  // mm (smaller)
        const logoHeight = 12; // mm (proportional)
        const logoX = pageWidth - margin - logoWidth;  // Right aligned
        const logoY = yPosition + 1;  // Slight offset from top
        console.log('[PDF] Logo position - X:', logoX, 'Y:', logoY, 'Width:', logoWidth, 'Height:', logoHeight);
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
        console.log('[PDF] Logo added successfully');
      } else {
        console.warn('[PDF] Logo URL conversion returned empty');
      }
    } catch (e) {
      console.warn('[PDF] Failed to load logo:', e);
    }
  } else {
    console.warn('[PDF] No logoUrl provided in options');
  }

  // Title line: "Número de pedido: [numero]" + Provider name on same line
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);  // Dark green
  
  const titleText = `Número de pedido: ${options.numeroPedido || 'N/A'}`;
  doc.text(titleText, margin, yPosition + 5);
  
  // Provider name on the right of same line
  if (options.nombreComercialProveedor) {
    doc.setFontSize(12);
    const providerText = options.nombreComercialProveedor;
    const providerWidth = doc.getStringUnitWidth(providerText) * doc.getFontSize() / doc.internal.scaleFactor;
    doc.text(providerText, pageWidth - margin - providerWidth, yPosition + 5);
  }
  
  doc.setTextColor(0, 0, 0);
  yPosition += 12;

  // Compact info line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const infoLines: string[] = [];
  if (options.osNumber) infoLines.push(`OS: ${options.osNumber}`);
  if (options.eventSpace) infoLines.push(`Espacio: ${options.eventSpace}`);
  if (infoLines.length > 0) {
    doc.text(infoLines.join(' · '), margin, yPosition);
    yPosition += 3;
  }

  const dateText = `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`;
  doc.text(dateText, margin, yPosition);
  yPosition += 5;

  // ===== TWO-COLUMN SECTION: DELIVERY/PICKUP (LEFT) + CONTACTS (RIGHT) =====
  const colWidth = contentWidth / 2;
  const colGap = 3;
  
  // Left column: ENTREGA Y RECOGIDA
  let leftY = yPosition;
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.4);
  doc.line(margin, leftY, margin + colWidth, leftY);
  leftY += 3;

  // ENTREGA section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(34, 139, 34);
  doc.text('ENTREGA', margin, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  for (const group of groups) {
    const fecha = safeFormatDate(group.fecha_entrega);
    const hora = safeFormatTime(group.hora_entrega);
    const entregaText = `Fecha: ${fecha} a las ${hora}`;
    doc.text(entregaText, margin + 1, leftY);
    leftY += 3;

    doc.setFont('helvetica', 'bold');
    doc.text('Dirección:', margin + 1, leftY);
    leftY += 2.5;
    doc.setFont('helvetica', 'normal');
    const direccionEntregaText = doc.splitTextToSize(options.eventAddress || 'N/A', colWidth - 6);
    doc.text(direccionEntregaText, margin + 3, leftY);
    leftY += direccionEntregaText.length * 2.5;

    doc.setFont('helvetica', 'bold');
    doc.text('Lugar:', margin + 1, leftY);
    leftY += 2.5;
    doc.setFont('helvetica', 'normal');
    const ubicacion = group.localizacion || 'N/A';
    const ubicacionText = doc.splitTextToSize(ubicacion, colWidth - 6);
    doc.text(ubicacionText, margin + 3, leftY);
    leftY += ubicacionText.length * 2.5;
  }

  // Separator line
  leftY += 1;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, leftY, margin + colWidth, leftY);
  leftY += 3;

  // RECOGIDA section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(34, 139, 34);
  doc.text('RECOGIDA', margin, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  for (const group of groups) {
    if (group.fecha_recogida) {
      const fechaRecog = safeFormatDate(group.fecha_recogida);
      const horaRecog = safeFormatTime(group.hora_recogida);
      const recogidaText = `Fecha: ${fechaRecog} a las ${horaRecog}`;
      doc.text(recogidaText, margin + 1, leftY);
      leftY += 3;

      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', margin + 1, leftY);
      leftY += 2.5;
      doc.setFont('helvetica', 'normal');
      const lugarRecogida = group.lugar_recogida === 'Evento' ? (options.eventAddress || 'Evento') : 'Nuestras instalaciones';
      const direccionRecogText = doc.splitTextToSize(lugarRecogida, colWidth - 6);
      doc.text(direccionRecogText, margin + 3, leftY);
      leftY += direccionRecogText.length * 2.5;

      doc.setFont('helvetica', 'bold');
      doc.text('Lugar:', margin + 1, leftY);
      leftY += 2.5;
      doc.setFont('helvetica', 'normal');
      const lugarRecogidaName = group.lugar_recogida || 'N/A';
      const lugarRecogidaText = doc.splitTextToSize(lugarRecogidaName, colWidth - 6);
      doc.text(lugarRecogidaText, margin + 3, leftY);
      leftY += lugarRecogidaText.length * 2.5;
    } else {
      doc.text('No aplica', margin + 1, leftY);
      leftY += 3;
    }
  }

  // Right column: CONTACTO
  let rightY = yPosition;
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.4);
  doc.line(margin + colWidth + colGap, rightY, pageWidth - margin, rightY);
  rightY += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(34, 139, 34);
  doc.text('CONTACTO', margin + colWidth + colGap, rightY);
  doc.setTextColor(0, 0, 0);
  rightY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const metre = `Maître: ${options.responsableMetre || '—'}`;
  doc.text(metre, margin + colWidth + colGap + 1, rightY);
  rightY += 3;

  const metrePhone = `Tel: ${options.telefonoMetre || '—'}`;
  doc.text(metrePhone, margin + colWidth + colGap + 1, rightY);
  rightY += 3;

  // Space between Maître and Pase
  rightY += 2;

  const pase = `Pase: ${options.responsablePase || '—'}`;
  doc.text(pase, margin + colWidth + colGap + 1, rightY);
  rightY += 3;

  const pasePhone = `Tel: ${options.telefonoPase || '—'}`;
  doc.text(pasePhone, margin + colWidth + colGap + 1, rightY);
  rightY += 4;

  // Move down after both columns
  yPosition = Math.max(leftY, rightY) + 3;
  yPosition += 4;
  // === ITEMS TABLE ===
  doc.setDrawColor(34, 139, 34);  // Dark green
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(34, 139, 34);  // Dark green
  doc.text('ARTÍCULOS', margin, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 6;

  // Draw table for each group
  let totalAmount = 0;
  let totalArticulos = 0;
  let totalUnidades = 0;

  for (const group of groups) {
    if (!group.items || group.items.length === 0) continue;

    const tableData: Array<{ text: string[]; image?: string | null }> = [];

    // Build table data with images
    for (const item of group.items) {
      const precioUnitario = item.priceSnapshot || item.price || 0;
      const cantidad = item.cantidad || 0;
      const dias = item.dias || options.dias || 1;
      // Total = precio unitario * cantidad * dias (dias are part of rental price calculation)
      const total = precioUnitario * cantidad * dias;
      
      totalAmount += total;
      totalArticulos += 1;
      totalUnidades += cantidad;

      // Fetch image if available
      let imageBase64: string | null = null;
      if (options.includeImages && item.imageUrl) {
        imageBase64 = await urlToBase64(item.imageUrl);
      }

      tableData.push({
        text: [
          item.description || '-',
          cantidad.toString(),
          dias.toString(),
          formatCurrency(precioUnitario),
          formatCurrency(total),
          item.subcategoria || '',  // Add category at index 5
        ],
        image: imageBase64,
      });
    }

    // Draw manual table with headers
    yPosition = drawManualTableWithHeaders(doc, tableData, yPosition, margin, pageWidth);
    yPosition += 4;
  }

  // Summary line (left-aligned after table)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const summaryText = `${totalArticulos} artículos · ${totalUnidades} unidades`;
  doc.text(summaryText, margin, yPosition, { align: 'left' });
  yPosition += 6;

  // === TOTAL SECTION ===
  doc.setDrawColor(34, 139, 34);  // Dark green
  doc.setLineWidth(1.4);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL PEDIDO:', margin, yPosition);
  doc.text(formatCurrency(totalAmount), pageWidth - margin - 15, yPosition, { align: 'right' });
  yPosition += 8;

  // === OBSERVATIONS SECTION ===
  doc.setDrawColor(34, 139, 34);  // Dark green
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OBSERVACIONES:', margin, yPosition);
  yPosition += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const observations = options.comments || 'N/A';
  
  // Word wrap observations
  const obsLines = doc.splitTextToSize(observations, contentWidth - 5);
  for (const line of obsLines) {
    doc.text(line, margin, yPosition);
    yPosition += 4;
  }

  return doc;
}

/**
 * Get PDF as Blob for download
 */
export function getPedidoPDFBlob(doc: jsPDF): Blob {
  const pdfData = doc.output('arraybuffer');
  return new Blob([pdfData], { type: 'application/pdf' });
}
