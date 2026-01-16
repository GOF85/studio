import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOsPanelPDF } from '@/lib/exports/os-panel-pdf';
import { resolveOsId } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const osId = searchParams.get('osId');

    console.debug('[export/route] Request received:', {
      osId,
      url: request.nextUrl.toString(),
    });

    if (!osId) {
      console.error('[export/route] Missing osId parameter');
      return NextResponse.json(
        { success: false, error: 'Missing osId' },
        { status: 400 }
      );
    }

    // Resolve OS ID
    console.debug('[export/route] Resolving osId:', { osId });
    const targetId = await resolveOsId(osId);
    console.debug('[export/route] Resolved to:', { targetId });

    // Fetch OS data
    const { data: osData, error: osError } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    console.debug('[export/route] Supabase query result:', {
      found: !!osData,
      error: osError?.message,
      numero_expediente: osData?.numero_expediente,
    });

    if (osError || !osData) {
      throw new Error(osError?.message || 'OS not found');
    }

    // Generate PDF
    const pdf = await generateOsPanelPDF(osData);
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
