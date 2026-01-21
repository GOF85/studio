import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * PATCH /api/pedidos/change-context/[id]
 * Change the context (solicita) of a pending order
 * Ejemplo: Sala → Cocina
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { newSolicita } = body;

    if (!newSolicita || !['Sala', 'Cocina'].includes(newSolicita)) {
      return NextResponse.json(
        { error: 'newSolicita must be "Sala" or "Cocina"' },
        { status: 400 }
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

    // Fetch current pedido to get all context
    const { data: currentPedido, error: fetchError } = await supabase
      .from('os_pedidos_pendientes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentPedido) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if target combination already exists
    const { data: existingPedido } = await supabase
      .from('os_pedidos_pendientes')
      .select('id')
      .eq('os_id', currentPedido.os_id)
      .eq('fecha_entrega', currentPedido.fecha_entrega)
      .eq('localizacion', currentPedido.localizacion)
      .eq('solicita', newSolicita)
      .single();

    if (existingPedido) {
      // Target already exists - merge items into existing
      // TODO: Implement merge logic
      // For now, return error
      return NextResponse.json(
        { error: 'Target context already exists. Merge not yet implemented.' },
        { status: 409 }
      );
    }

    // Update solicita
    const { data, error } = await supabase
      .from('os_pedidos_pendientes')
      .update({ solicita: newSolicita })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in PATCH /api/pedidos/change-context/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
