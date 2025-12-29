const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'eventos' });
  if (error) {
    // Try another way
    const { data: columns, error: err } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'eventos');
    console.log('Columns:', columns || err);
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
