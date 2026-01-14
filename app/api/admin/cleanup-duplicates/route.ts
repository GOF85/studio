/**
 * DELETE /api/admin/cleanup-duplicates
 * Solo para limpieza manual de duplicados
 * Usa API KEY en headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
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

    console.log('🗑️ Limpiando pedidos duplicados...');

    // Get ALL pedidos grouped by numero_pedido
    const { data: allOrders, error: fetchError } = await supabase
      .from('os_pedidos_enviados')
      .select('id, numero_pedido, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    // Group by numero_pedido
    const grouped: Record<string, any[]> = {};
    for (const order of allOrders || []) {
      if (!grouped[order.numero_pedido]) {
        grouped[order.numero_pedido] = [];
      }
      grouped[order.numero_pedido].push(order);
    }

    let deletedCount = 0;
    const deletedIds: string[] = [];

    // Find duplicates and delete newer ones
    for (const [numero, orders] of Object.entries(grouped)) {
      if (orders.length > 1) {
        console.log(`📋 ${numero}: ${orders.length} encontrados`);
        
        // Keep the oldest (first), delete the rest
        for (let i = 1; i < orders.length; i++) {
          const { error: deleteError } = await supabase
            .from('os_pedidos_enviados')
            .delete()
            .eq('id', orders[i].id);

          if (!deleteError) {
            console.log(`  ❌ Eliminado: ${orders[i].id}`);
            deletedIds.push(orders[i].id);
            deletedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      deletedIds,
      message: `Limpieza completada: ${deletedCount} registros eliminados`,
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
