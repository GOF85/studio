import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { PedidoEnviado } from '@/types';

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const body = await request.json();
    const { pedidoId, osId, updates, editedBy } = body;

    if (!pedidoId || !osId || !updates) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Actualizar el pedido enviado
    const { data, error } = await supabase
      .from('os_pedidos_enviados')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)
      .eq('os_id', osId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pedido:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error in PATCH /api/pedidos/update-enviado:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
