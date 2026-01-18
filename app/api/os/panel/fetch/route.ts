import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for reads (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { osId } = await request.json();

    if (!osId) {
      return NextResponse.json(
        { error: 'Missing osId' },
        { status: 400 }
      );
    }

    console.log('[OS Panel Fetch] Fetching osId:', osId);

    // If it's already a UUID, query directly
    if (osId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('[OS Panel Fetch] osId is UUID, querying directly');
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', osId)
        .maybeSingle();

      console.log('[OS Panel Fetch] UUID query result - data exists:', !!data, 'metre_responsable:', data?.metre_responsable, 'error:', error);

      if (error) {
        console.error('[OS Panel Fetch] Error fetching by UUID:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    // Otherwise, resolve numero_expediente to UUID first
    console.log('[OS Panel Fetch] osId is not UUID, resolving numero_expediente:', osId);
    const { data: eventoData, error: resolvError } = await supabase
      .from('eventos')
      .select('id')
      .eq('numero_expediente', osId)
      .maybeSingle();

    console.log('[OS Panel Fetch] Resolve query result - data:', eventoData, 'error:', resolvError);

    if (resolvError) {
      console.error('[OS Panel Fetch] Error resolving numero_expediente:', resolvError);
      return NextResponse.json({ error: resolvError.message }, { status: 400 });
    }

    if (!eventoData?.id) {
      console.warn('[OS Panel Fetch] No evento found for numero_expediente:', osId);
      return NextResponse.json({ data: null });
    }

    // Now fetch the full data
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', eventoData.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[OS Panel Fetch] Exception:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
