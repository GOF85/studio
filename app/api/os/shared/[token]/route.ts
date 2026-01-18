import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const { data: link, error: linkError } = await supabase
      .from('os_shared_links')
      .select('os_id, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (linkError || !link) {
      return NextResponse.json({ error: 'Link invalid' }, { status: 404 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }

    const { data: osData, error: osError } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', link.os_id)
      .maybeSingle();

    if (osError || !osData) {
       return NextResponse.json({ error: 'OS not found' }, { status: 404 });
    }

    return NextResponse.json({ data: osData });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
