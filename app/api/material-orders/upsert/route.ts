import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { osId, type = 'Alquiler', items: newItems = [], days, deliveryDate, deliverySpace, deliveryLocation, solicita } = await request.json();

    console.log('\n🔵 [API UPSERT] Parámetros recibidos:');
    console.log(`   osId: ${osId}`);
    console.log(`   type: ${type}`);
    console.log(`   newItems count: ${newItems.length}`);
    console.log(`   deliveryDate: ${deliveryDate}`);
    console.log(`   deliveryLocation: ${deliveryLocation}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // If SERVICE_ROLE_KEY is not available, try to use a workaround
    if (!supabaseKey) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not configured. Attempting fallback...');
      // This will fail with RLS error, which helps identify the issue
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Check if pending order exists for this OS
    console.log(`\n📥 Buscando pedido asignado para OS: ${osId}`);
    const { data: existingOrder, error: fetchError } = await supabase
      .from('os_material_orders')
      .select('id, os_id, type, status, items')
      .eq('os_id', osId)
      .eq('type', type)
      .eq('status', 'Asignado')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected
      console.error(`❌ Error fetching order: ${fetchError.message}`);
      return NextResponse.json({ error: `Error checking order: ${fetchError.message}` }, { status: 400 });
    }

    let mergedItems = newItems;
    let orderId: string;

    if (existingOrder) {
      // MERGE: Existing order found
      console.log(`✅ Pedido asignado encontrado: ${existingOrder.id}`);

      let currentItems = [];
      try {
        // items is always stored as JSON string in database
        if (typeof existingOrder.items === 'string') {
          currentItems = JSON.parse(existingOrder.items);
        } else if (Array.isArray(existingOrder.items)) {
          currentItems = existingOrder.items;
        }
      } catch (parseError) {
        console.warn(`⚠️  Could not parse existing items:`, parseError);
        currentItems = [];
      }

      console.log(`   Items actuales: ${currentItems.length}`);
      console.log(`   Current item details:`, currentItems.map((i: any) => ({ code: i.itemCode, qty: i.quantity })));

      // Merge new items with existing items
      mergedItems = [...currentItems];
      
      for (const newItem of newItems) {
        const existingIndex = mergedItems.findIndex((item: any) => item.itemCode === newItem.itemCode);
        if (existingIndex !== -1) {
          // Item exists: merge quantity and update other fields
          const oldQty = mergedItems[existingIndex].quantity || 0;
          const newQty = newItem.quantity || 0;
          console.log(`   Fusionando item ${newItem.itemCode}: qty ${oldQty} + ${newQty} = ${oldQty + newQty}`);
          mergedItems[existingIndex] = {
            ...mergedItems[existingIndex],
            ...newItem,
            quantity: oldQty + newQty,
          };
        } else {
          // New item: add it
          console.log(`   Agregando item nuevo: ${newItem.itemCode} qty ${newItem.quantity}`);
          mergedItems.push(newItem);
        }
      }

      orderId = existingOrder.id;
      console.log(`📦 Items fusionados: ${mergedItems.length} items totales`);
      console.log(`   Final items:`, mergedItems.map((i: any) => ({ code: i.itemCode, qty: i.quantity })));
    } else {
      // INSERT: Create new pending order
      console.log(`🆕 Creando nuevo pedido asignado para OS: ${osId}`);
      const { data: newOrder, error: insertError } = await supabase
        .from('os_material_orders')
        .insert({
          os_id: osId,
          type: type,
          status: 'Asignado',
          items: JSON.stringify(mergedItems),
          days: days || 1,
          delivery_date: deliveryDate,
          delivery_space: deliverySpace,
          delivery_location: deliveryLocation,
          solicita: solicita || 'Sala',
          total: mergedItems.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(`❌ Error creating order: ${insertError.message}`);
        return NextResponse.json({ error: `Error creating order: ${insertError.message}` }, { status: 400 });
      }

      orderId = newOrder.id;
      console.log(`✅ Nuevo pedido creado: ${orderId}`);
    }

    // Step 2: Update the order with merged items
    console.log(`\n💾 Guardando items en pedido ${orderId}...`);
    const { data: updatedOrder, error: updateError } = await supabase
      .from('os_material_orders')
      .update({
        items: JSON.stringify(mergedItems),
        delivery_date: deliveryDate,
        delivery_space: deliverySpace,
        delivery_location: deliveryLocation,
        solicita: solicita || 'Sala',
        total: mergedItems.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('id, os_id, type, status, days, total, contract_number, delivery_date, delivery_space, delivery_location, solicita')
      .single();

    if (updateError) {
      console.error(`❌ Error updating order: ${updateError.message}`);
      return NextResponse.json({ error: `Error updating order: ${updateError.message}` }, { status: 400 });
    }

    console.log(`✅ Pedido actualizado exitosamente`);
    return NextResponse.json({ 
      success: true, 
      orderId,
      itemCount: mergedItems.length,
      total: mergedItems.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0),
    });
  } catch (error) {
    console.error('❌ [API] Error no manejado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
