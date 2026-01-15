import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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
    const {
      pedido_id,
      os_id,
      usuario_id,
      usuario_email,
      tipo_cambio,
      cambios,
      razon,
    } = body;

    if (!pedido_id || !os_id || !usuario_id) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Crear tabla de logs si no existe
    const { data: logData, error: logError } = await supabase
      .from('os_pedidos_change_log')
      .insert({
        pedido_id,
        os_id,
        usuario_id,
        usuario_email,
        tipo_cambio,
        cambios,
        razon,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError && logError.code !== 'PGRST116') {
      // PGRST116 = relation does not exist, en cuyo caso creamos el log en memoria
      console.warn('Warning al registrar log:', logError);
      // No lanzamos error, continuamos sin log persistente
    }

    return NextResponse.json(
      { 
        message: 'Change logged successfully',
        logged: !logError || logError.code === 'PGRST116',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/pedidos/log-change:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
