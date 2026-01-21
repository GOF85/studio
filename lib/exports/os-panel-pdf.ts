import jsPDF from 'jspdf';

interface GenerateOsPanelPDFOptions {
  logoUrl?: string;
  watermark?: string;
  includeImages?: boolean;
  personalMap?: Map<string, string>;
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
  panelData: any, // Leaving for backward compatibility if needed
  options?: GenerateOsPanelPDFOptions
): Promise<jsPDF> {
  const { logoUrl, watermark = '', includeImages = true, personalMap } = options || {};

  // Initialize jsPDF
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  // Helper to resolve personal names
  const resolveName = (id: string) => {
    if (!id) return null;
    return personalMap?.get(id) || id;
  };

  const resolveNames = (ids: string | string[] | null) => {
    if (!ids) return '—';
    const idArray = Array.isArray(ids) ? ids : [ids];
    return idArray.map(id => resolveName(id)).filter(Boolean).join(', ') || '—';
  };

  // Helper: Add section header
  const addSectionHeader = (title: string) => {
    checkPageBreak(15);
    yPosition += 4;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition - 5, contentWidth, 7, 'F');
    doc.setTextColor(40, 40, 40);
    doc.text(title, margin + 2, yPosition);
    yPosition += 6;
    doc.setTextColor(0, 0, 0);
  };

  // Helper: Check Page Break
  const checkPageBreak = (needed: number) => {
    if (yPosition + needed > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      // Add a small header on new pages
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`OS ${osData.numero_expediente} - Continuación`, margin, yPosition - 5);
    }
  };

  // Helper: Add Field (Label: Value)
  const addField = (label: string, value: any, compact = false) => {
    const textValue = String(value || '—');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    const wrappedLabel = doc.splitTextToSize(label + ':', 40);
    const wrappedValue = doc.splitTextToSize(textValue, contentWidth - 45);
    
    const height = Math.max(wrappedLabel.length, wrappedValue.length) * 4.5;
    checkPageBreak(height);

    doc.text(wrappedLabel, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(wrappedValue, margin + 42, yPosition);
    
    yPosition += height + (compact ? 0.5 : 2);
  };

  // Helper: Add Boolean/Checkbox
  const addCheckbox = (label: string, value: boolean) => {
    checkPageBreak(5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const symbol = value ? '[X]' : '[ ]';
    doc.text(`${symbol} ${label}`, margin, yPosition);
    yPosition += 5;
  };

  // --- HEADER ---
  if (logoUrl && includeImages) {
    const logoBase64 = await urlToBase64(logoUrl);
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, margin, 25, 25);
      } catch (e) {
        console.error('Error adding logo to PDF', e);
      }
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PANEL DE CONTROL OPERATIVO', margin + 30, margin + 10);
  doc.setFontSize(12);
  doc.text(`Expediente: ${osData.numero_expediente}`, margin + 30, margin + 17);

  yPosition = margin + 30;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de generación: ${new Date().toLocaleString('es-ES')}`, margin, yPosition);
  yPosition += 8;

  // --- 1. INFORMACIÓN BÁSICA ---
  addSectionHeader('INFORMACIÓN DEL EVENTO');
  addField('Cliente', osData.client);
  addField('Evento', osData.nombre_evento);
  addField('Espacio', osData.space);
  addField('Dirección', osData.space_address);
  
  const startDate = osData.start_date ? new Date(osData.start_date).toLocaleDateString('es-ES') : '—';
  const endDate = osData.end_date ? new Date(osData.end_date).toLocaleDateString('es-ES') : '—';
  addField('Fechas', `${startDate} al ${endDate}`);
  addField('Asistentes', osData.asistentes);
  addField('VIP', osData.is_vip ? 'SÍ' : 'NO');

  // --- 2. EQUIPO PRINCIPAL ---
  addSectionHeader('EQUIPO Y RESPONSABLES');
  addField('Comercial', resolveName(osData.comercial));
  addField('Logística Resp.', resolveName(osData.logistica));
  addField('Project Manager', resolveName(osData.resp_project_manager));
  addField('Maitre Responsable', resolveName(osData.resp_metre));

  // --- 3. OPERATIVA DE SALA ---
  addSectionHeader('OPERATIVA DE SALA');
  addField('Maitres / Responsables', resolveNames(osData.metres));
  addField('Camareros Extra', osData.camareros_ext);
  addField('Logísticos Extra Sala', osData.logisticos_ext);
  addField('Revisado por PM', osData.os_revision_pm ? 'COMPLETADO' : 'PENDIENTE');
  
  yPosition += 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Checklist Operativa:', margin, yPosition);
  yPosition += 5;

  const salaChecks = [
    { label: 'ETT Solicitada', val: osData.os_sala_ett },
    { label: 'Material Limpio/Revisado', val: osData.os_sala_material_limpio },
    { label: 'KPIs definidos', val: osData.os_sala_kpis },
    { label: 'Pedidos realizados', val: osData.os_sala_pedidos },
    { label: 'PNT repasado', val: osData.os_sala_pnt },
    { label: 'Almacén Bio / Material', val: osData.os_sala_almacen_bio },
    { label: 'Material Externo', val: osData.os_sala_material_externo },
    { label: 'Llaves / Taquillas', val: osData.os_sala_llaves_taquillas },
    { label: 'Uniformidad', val: osData.os_sala_uniformidad },
    { label: 'Transporte coordinado', val: osData.os_sala_transporte },
    { label: 'Desmontaje Express', val: osData.os_sala_desmontaje_express },
  ];

  // Split checks into two columns to save space
  const mid = Math.ceil(salaChecks.length / 2);
  const startY = yPosition;
  salaChecks.slice(0, mid).forEach(check => addCheckbox(check.label, check.val));
  const leftY = yPosition;
  
  yPosition = startY;
  // Second column offset
  salaChecks.slice(mid).forEach(check => {
    checkPageBreak(5);
    const symbol = check.val ? '[X]' : '[ ]';
    doc.text(`${symbol} ${check.label}`, margin + contentWidth/2, yPosition);
    yPosition += 5;
  });
  
  yPosition = Math.max(leftY, yPosition) + 5;

  // --- 4. OPERATIVA DE COCINA ---
  addSectionHeader('OPERATIVA DE COCINA');
  addField('Jefe de Cocina', resolveName(osData.jefe_cocina));
  addField('Equipo de Cocina', resolveNames(osData.cocina));
  addField('Cocineros Extra', osData.cocineros_ext);
  addField('Logísticos Extra Cocina', osData.logisticos_ext_cocina);
  
  yPosition += 2;
  addCheckbox('Gastronomía Actualizada', osData.os_cocina_gastro_actualizada);
  addCheckbox('Pedidos Enviados', osData.os_cocina_pedidos_enviados);
  addCheckbox('Servicios Extra coordinados', osData.os_cocina_servicios_extra);
  yPosition += 3;

  // --- 5. LOGÍSTICA Y MONTAJE ---
  addSectionHeader('LOGÍSTICA Y MONTAJE');
  addField('Mozo / Responsable', resolveName(osData.mozo));
  addField('Estado Almacén', osData.os_logistica_estado_almacen);
  addField('Proveedor Logístico', osData.os_logistica_proveedor);
  addField('Horarios Carga/Descarga', osData.os_logistica_horarios);
  
  yPosition += 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Recursos:', margin, yPosition);
  yPosition += 5;
  
  addField('Carambucos', osData.os_logistica_carambucos, true);
  addField('Jaulas', osData.os_logistica_jaulas, true);
  addField('Pallets', osData.os_logistica_pallets, true);
  addCheckbox('Alquiler Lanzado', osData.os_logistica_alquiler_lanzado);

  // --- FOOTER ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${totalPages} - Confidencial Studio`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc;
}
