
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'pedidos_hielo' });
    if (error) {
        // If RPC doesn't exist, try a raw query if possible, or just try to guess
        console.log('RPC failed, trying select from information_schema');
        const { data: columns, error: colError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'pedidos_hielo');
        
        if (colError) {
            console.error('Error fetching columns:', colError);
        } else {
            console.log('Columns:', columns.map(c => c.column_name));
        }
    } else {
        console.log('Columns:', data);
    }
}

checkSchema();
