import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { osId, type } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all orders for this OS and type
    const { data, error } = await supabase
      .from('os_material_orders')
      .select('*')
      .eq('os_id', osId)
      .eq('type', type);

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Map database format to application format
    const mappedData = (data || []).map(o => {
      // Parse items if it's a JSON string
      let items = [];
      if (o.items) {
        if (typeof o.items === 'string') {
          try {
            items = JSON.parse(o.items);
          } catch (e) {
            console.warn('Failed to parse items:', e);
            items = [];
          }
        } else {
          items = Array.isArray(o.items) ? o.items : [];
        }
      }
      
      return {
        id: o.id,
        osId: o.os_id,
        type: o.type,
        status: o.status,
        items,
        days: o.days,
        total: o.total,
        contractNumber: o.contract_number,
        deliveryDate: o.delivery_date,
        deliverySpace: o.delivery_space,
        deliveryLocation: o.delivery_location,
        solicita: o.solicita
      };
    });

    return NextResponse.json({ data: mappedData });
  } catch (error) {
    console.error('❌ [API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
