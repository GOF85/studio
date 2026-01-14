/**
 * Script para limpiar pedidos duplicados con numero_pedido A0003
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function cleanupDuplicates() {
  console.log('🗑️  Limpiando pedidos duplicados...\n');

  try {
    // Obtener todos los pedidos con numero_pedido duplicado
    const { data: allOrders, error: fetchError } = await supabase
      .from('os_pedidos_enviados')
      .select('id, numero_pedido, os_id, fecha_entrega, localizacion, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error al obtener pedidos:', fetchError);
      return;
    }

    // Group by numero_pedido
    const grouped: Record<string, any[]> = {};
    for (const order of allOrders || []) {
      if (!grouped[order.numero_pedido]) {
        grouped[order.numero_pedido] = [];
      }
      grouped[order.numero_pedido].push(order);
    }

    // Find duplicates
    let deletedCount = 0;
    for (const [numero, orders] of Object.entries(grouped)) {
      if (orders.length > 1) {
        console.log(`\n📋 ${numero}: ${orders.length} registros encontrados`);
        
        // Keep the oldest (first created), delete the rest
        const toKeep = orders[orders.length - 1]; // oldest
        const toDelete = orders.slice(0, -1); // newer ones

        for (const order of toDelete) {
          console.log(`   ❌ Eliminando: ID ${order.id} (creado: ${order.created_at})`);
          
          const { error: deleteError } = await supabase
            .from('os_pedidos_enviados')
            .delete()
            .eq('id', order.id);

          if (deleteError) {
            console.error(`      Error al eliminar: ${deleteError.message}`);
          } else {
            deletedCount++;
            console.log(`      ✅ Eliminado`);
          }
        }

        console.log(`   ✅ Manteniendo: ID ${toKeep.id} (creado: ${toKeep.created_at})`);
      }
    }

    console.log(`\n✅ Limpieza completada: ${deletedCount} registros eliminados\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

cleanupDuplicates();
