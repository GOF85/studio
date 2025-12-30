const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'pedidos_entrega' });
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema if possible, 
    // but usually we can't do that from client. 
    // Let's try to just select one row and see what we get.
    console.log('RPC get_table_columns failed, trying direct select...');
    const { data: row, error: selectError } = await supabase.from('pedidos_entrega').select('*').limit(1);
    if (selectError) {
      console.error('Error selecting from pedidos_entrega:', selectError);
    } else if (row && row.length > 0) {
      console.log('Columns:', Object.keys(row[0]));
    } else {
      console.log('Table is empty, could not determine columns via select *');
      // Try to insert a dummy row with a known column to see if it fails or what columns it suggests
      const { error: insertError } = await supabase.from('pedidos_entrega').insert({ non_existent_column: 'test' });
      console.log('Insert error (expected):', insertError.message);
    }
  } else {
    console.log('Columns:', data);
  }
}

checkColumns();
