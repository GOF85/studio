
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
    console.log('Testing RPC with search term "ECLAIR"...');
    const { data, error } = await supabase.rpc('get_articulos_erp_paginated', {
        p_page: 0,
        p_page_size: 5,
        p_search_term: 'ECLAIR',
        p_type_filter: 'all',
        p_provider_filter: 'all',
        p_sort_by: 'nombre',
        p_sort_order: 'asc'
    });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Data:', JSON.stringify(data, null, 2));
    }
}

testRPC();
