
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const testOsId = '550e8400-e29b-41d4-a716-446655440000'; // Random UUID
    const { data, error } = await supabase.from('pedidos_hielo').insert({
        evento_id: testOsId,
        tipo_hielo: 'Test',
        cantidad_kg: 1,
        precio_kg: 1,
        total: 1
    }).select();

    if (error) {
        console.error('Insert Error:', error);
    } else {
        console.log('Insert Success:', data);
    }
}

testInsert().then(() => console.log('Done'));
