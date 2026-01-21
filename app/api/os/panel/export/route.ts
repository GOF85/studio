import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOsPanelPDF } from '@/lib/exports/os-panel-pdf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function resolveOsIdServer(osId: string): Promise<string> {
  if (!osId) return '';
  if (osId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return osId;

  const { data: eventoData } = await supabase
    .from('eventos')
    .select('id')
    .eq('numero_expediente', osId)
    .maybeSingle();
  if (eventoData?.id) return eventoData.id;

  const { data: entregaData } = await supabase
    .from('entregas')
    .select('id')
    .eq('numero_expediente', osId)
    .maybeSingle();
  if (entregaData?.id) return entregaData.id;

  return osId;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const osId = searchParams.get('osId');

    if (!osId) {
      console.error('[export/route] Missing osId parameter');
      return NextResponse.json(
        { success: false, error: 'Missing osId' },
        { status: 400 }
      );
    }

    // Resolve OS ID with service role
    const targetId = await resolveOsIdServer(osId);
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: 'OS ID not found' },
        { status: 400 }
      );
    }

    // Fetch OS data
    const { data: osData, error: osError } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (osError || !osData) {
      throw new Error(osError?.message || 'OS not found');
    }

    // Fetch personal lookup data for resolving IDs to names
    const { data: personalData } = await supabase
      .from('personal')
      .select('id, nombre, apellido1, apellido2');

    const personalMap = new Map();
    if (personalData) {
      personalData.forEach(p => {
        const fullName = `${p.nombre} ${p.apellido1}${p.apellido2 ? ' ' + p.apellido2 : ''}`;
        personalMap.set(p.id, fullName);
      });
    }

    // Generate PDF
    const pdf = await generateOsPanelPDF(osData, {}, { personalMap });
    const pdfBytes = pdf.output('arraybuffer');

    // Return as binary
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="OS-${osData.numero_expediente}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error exporting OS panel PDF:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
