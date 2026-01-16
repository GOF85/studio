import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveOsId } from '@/lib/supabase';
import type { OsPanelHistoryResponse } from '@/types/os-panel';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const osId = searchParams.get('osId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!osId) {
      return NextResponse.json(
        { success: false, error: 'Missing osId' },
        { status: 400 }
      );
    }

    // Resolve OS ID
    const targetId = await resolveOsId(osId);

    // Fetch changes
    const { data, error, count } = await supabase
      .from('os_panel_cambios')
      .select('*', { count: 'exact' })
      .eq('os_id', targetId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const response: OsPanelHistoryResponse = {
      success: true,
      data: data || [],
      total: count || 0,
      limit,
      offset,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching OS panel history:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
