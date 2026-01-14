import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { resolveOsId } from '@/lib/supabase';

/**
 * GET /api/pedidos/pendientes?osId=xxx
 * Retrieve all pending rental orders for an OS
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

    // Resolve osId (could be UUID or numero_expediente)
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

    // Fetch pending orders
    const { data, error } = await supabase
      .from('os_pedidos_pendientes')
      .select('*')
      .eq('os_id', resolvedOsId)
      .order('fecha_entrega', { ascending: true })
      .order('localizacion', { ascending: true })
      .order('solicita', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in GET /api/pedidos/pendientes:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pedidos/pendientes
 * Create a new pending rental order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { osId, fechaEntrega, localizacion, solicita, items, createdBy } = body;

    // Validate required fields
    if (!osId || !fechaEntrega || !localizacion || !solicita || !items) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Calculate metrics
    const cantidadArticulos = items.length;
    const cantidadUnidades = items.reduce(
      (sum: number, item: any) => sum + (item.cantidad || 0),
      0
    );

    // Create pending order
    const { data, error } = await supabase
      .from('os_pedidos_pendientes')
      .insert({
        os_id: resolvedOsId,
        fecha_entrega: fechaEntrega,
        localizacion,
        solicita,
        items,
        cantidad_articulos: cantidadArticulos,
        cantidad_unidades: cantidadUnidades,
        estado: 'Pendiente',
        created_by: createdBy || null, // Allow null if not provided
      })
      .select()
      .single();

    if (error) {
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This order combination already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/pedidos/pendientes:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
