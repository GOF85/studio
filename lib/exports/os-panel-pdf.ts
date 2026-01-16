import jsPDF from 'jspdf';

interface GenerateOsPanelPDFOptions {
  logoUrl?: string;
  watermark?: string;
  includeImages?: boolean;
}

/**
 * Convert image URL to Base64
 */
async function urlToBase64(
  imageUrl: string,
  timeoutMs: number = 5000
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generate OS Panel PDF
 */
export async function generateOsPanelPDF(
  osData: any,
  panelData: any,
  options?: GenerateOsPanelPDFOptions
): Promise<jsPDF> {
  const { logoUrl, watermark = '', includeImages = true } = options || {};

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  // Helper: Add title
  const addTitle = (text: string) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, yPosition);
    yPosition += 8;
  };

  // Helper: Add section header
  const addSectionHeader = (text: string) => {
    yPosition += 2;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(text, margin, yPosition);
    yPosition += 6;

    // Line under header
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
  };

  // Helper: Add field
  const addField = (label: string, value: string | string[]) => {
    if (yPosition > pageHeight - 10) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(label + ':', margin, yPosition);

    doc.setFont('helvetica', 'normal');
    const displayValue = Array.isArray(value)
      ? value.join(', ') || '—'
      : value || '—';

    const wrappedText = doc.splitTextToSize(
      displayValue,
      contentWidth - 40
    );
    doc.text(wrappedText, margin + 35, yPosition);

    yPosition += Math.max(5, wrappedText.length * 4);
  };

  // Helper: Add boolean field
  const addBooleanField = (label: string, value: boolean) => {
    addField(label, value ? '✓ Sí' : '○ No');
  };

  // Helper: Add page break if needed
  const checkPageBreak = (lines: number = 5) => {
    if (yPosition + lines * 4 > pageHeight - 10) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // PAGE 1: Header
  if (logoUrl && includeImages) {
    const logoBase64 = await urlToBase64(logoUrl);
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, margin, 30, 30);
      } catch {
        // Skip if image fails
      }
    }
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`OS ${osData.numero_expediente}`, margin + 35, margin + 12);

  yPosition = margin + 40;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, margin, yPosition);
  yPosition += 8;

  if (watermark) {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.text(watermark, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: -45,
    });
    doc.setTextColor(0, 0, 0);
  }

  // PESTAÑA 1: ESPACIO
  yPosition += 5;
  addSectionHeader('📅 ESPACIO');

  addField('Número Expediente', osData.numero_expediente);
  addField('Cliente', osData.client || '—');
  addField('Cliente Final', osData.final_client || '—');
  addField('Espacio', osData.space || '—');
  addField('Dirección', osData.space_address || '—');

  if (osData.start_date || osData.end_date) {
    const startDate = osData.start_date
      ? new Date(osData.start_date).toLocaleDateString('es-ES')
      : '—';
    const endDate = osData.end_date
      ? new Date(osData.end_date).toLocaleDateString('es-ES')
      : '—';
    addField('Fechas', `${startDate} - ${endDate}`);
  }

  addField('Asistentes', String(osData.asistentes || 0));
  addField('Vertical', osData.vertical || '—');
  if (osData.is_vip) {
    addBooleanField('VIP', true);
  }

  // PAGE BREAK
  doc.addPage();
  yPosition = margin;

  // INFORMACIÓN GENERAL
  addSectionHeader('📋 INFORMACIÓN GENERAL');

  addField('Estado', osData.status || '—');
  addField('Comercial', osData.comercial || '—');
  addField('Responsable Metre', osData.resp_metre || '—');
  addField('Responsable PM', osData.resp_project_manager || '—');
  addField('Responsable Pase', osData.resp_pase || '—');

  addField('Teléfono Contacto', osData.phone || '—');
  addField('Email Contacto', osData.email || '—');

  if (osData.comments) {
    addField('Comentarios', osData.comments);
  }

  return doc;
}
