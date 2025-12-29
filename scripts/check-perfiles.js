const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'perfiles' });
  if (error) {
    // If RPC doesn't exist, try a simple query
    const { data: sample, error: sampleError } = await supabase.from('perfiles').select('*').limit(1);
    if (sampleError) {
      console.error(sampleError);
    } else {
      console.log('Columns in perfiles:', Object.keys(sample[0] || {}));
    }
  } else {
    console.log('Columns in perfiles:', data);
  }
}

checkColumns();
