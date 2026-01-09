import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId, itemCode, field, value } = await request.json();

    console.log('\n🔵 [API UPDATE] Parámetros recibidos:');
    console.log(`   orderId: ${orderId}`);
    console.log(`   itemCode: ${itemCode}`);
    console.log(`   field: ${field}`);
    console.log(`   value: ${value}`);

    // Create a Supabase client using environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 });
    }
    
    if (!supabaseKey) {
      console.error('❌ Missing Supabase keys');
      return NextResponse.json({ error: 'Missing Supabase authentication keys' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the order with all items
    console.log(`📥 Buscando orden: ${orderId}`);
    const { data: order, error: fetchError } = await supabase
      .from('os_material_orders')
      .select('id, os_id, type, status, days, total, contract_number, delivery_date, delivery_space, delivery_location, solicita, items')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error(`❌ Error fetching order: ${fetchError.message}`);
      console.error(`   Code: ${fetchError.code}`);
      return NextResponse.json({ error: `Order not found: ${fetchError.message}` }, { status: 404 });
    }

    if (!order) {
      console.error(`❌ Order is null`);
      return NextResponse.json({ error: 'Order is null' }, { status: 404 });
    }

    console.log(`✅ Orden encontrada: ${order.id}`);
    
    // Parse items if it's a string (JSON)
    let items: any[] = [];
    if (typeof order.items === 'string') {
      try {
        items = JSON.parse(order.items);
      } catch (e) {
        console.error(`❌ Error parsing items JSON: ${e}`);
        items = [];
      }
    } else if (Array.isArray(order.items)) {
      items = order.items;
    }
    
    console.log(`   Items en la orden: ${items.length}`);
    if (items.length > 0) {
      console.log(`   Primeros 3 itemCodes: ${items.slice(0, 3).map((i: any) => i.itemCode).join(', ')}`);
    }

    // Update the specific item in the items array
    console.log(`🔍 Buscando item con itemCode: ${itemCode}`);
    const itemIndex = items.findIndex((item: any) => item.itemCode === itemCode);

    if (itemIndex === -1) {
      console.error(`❌ Item NO encontrado. itemCode '${itemCode}' no existe en la orden`);
      console.log(`   ItemCodes disponibles: ${items.map((i: any) => i.itemCode).join(', ')}`);
      return NextResponse.json({ error: `Item not found: ${itemCode}` }, { status: 404 });
    }

    console.log(`✅ Item encontrado en índice: ${itemIndex}`);
    const originalItem = items[itemIndex];
    console.log(`   Valor original de '${field}': ${originalItem[field]}`);
    console.log(`   Nuevo valor: ${value}`);

    // Map field names to item properties
    const fieldMap: Record<string, string> = {
      quantity: 'quantity',
      deliveryDate: 'deliveryDate',
      deliveryLocation: 'deliveryLocation',
      solicita: 'solicita',
      price: 'price',
    };

    const itemField = fieldMap[field] || field;
    const updatedItem = { ...items[itemIndex], [itemField]: value };

    // Recalculate total if quantity or price changed
    if (field === 'quantity' || field === 'price') {
      const qty = field === 'quantity' ? value : (items[itemIndex].quantity ?? 0);
      const price = field === 'price' ? value : (items[itemIndex].price ?? 0);
      updatedItem.total = qty * price;
      console.log(`💰 Total recalculado: ${qty} * ${price} = ${updatedItem.total}`);
    }

    // Update items array
    items[itemIndex] = updatedItem;
    console.log(`📦 Array de items actualizado (total: ${items.length})`);

    // Update the order with the modified items array
    // Convert items back to JSON string before saving
    console.log(`💾 Guardando orden actualizada en BD...`);
    const { data, error } = await supabase
      .from('os_material_orders')
      .update({ items: JSON.stringify(items) })
      .eq('id', orderId)
      .select('id, os_id, type, status, days, total, contract_number, delivery_date, delivery_space, delivery_location, solicita')
      .single();

    if (error) {
      console.error(`❌ Error al actualizar orden:`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Details: ${error.details}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      console.error(`❌ Respuesta vacía de la BD`);
      return NextResponse.json({ error: 'Order update failed - no data returned' }, { status: 404 });
    }

    console.log(`✅ Orden actualizada exitosamente`);
    console.log(`   Datos retornados: ${JSON.stringify(data).substring(0, 100)}...`);
    return NextResponse.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error('❌ [API] Error no manejado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
