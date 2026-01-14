import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { resolveOsId } from '@/lib/supabase';

/**
 * GET /api/pedidos/enviados?osId=xxx
 * Retrieve all sent/consolidated rental orders for an OS
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const osId = searchParams.get('osId');

    if (!osId) {
      return NextResponse.json(
        { error: 'osId is required' },
        { status: 400 }
      );
    }

    // Resolve osId
    const resolvedOsId = await resolveOsId(osId);
    if (!resolvedOsId) {
      return NextResponse.json(
        { error: 'OS not found' },
        { status: 404 }
      );
    }

    // Get Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Fetch sent orders
    const { data, error } = await supabase
      .from('os_pedidos_enviados')
      .select('*')
      .eq('os_id', resolvedOsId)
      .order('fecha_entrega', { ascending: true })
      .order('localizacion', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in GET /api/pedidos/enviados:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
