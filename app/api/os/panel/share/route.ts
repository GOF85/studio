import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { osId } = await request.json();
    
    if (!osId) {
      return NextResponse.json({ error: 'Missing osId' }, { status: 400 });
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

    const { data: evento } = await supabase
      .from('eventos')
      .select('id')
      .or(`id.eq.${osId},numero_expediente.eq.${osId}`)
      .maybeSingle();

    if (!evento) {
      return NextResponse.json({ error: 'OS not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('os_shared_links')
      .insert({
        os_id: evento.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      token,
      url: `${request.nextUrl.origin}/shared/${token}`
    });
  } catch (error) {
    console.error('[OS Share] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
