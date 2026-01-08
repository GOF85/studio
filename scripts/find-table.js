
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTable() {
  const { data, error } = await supabase.from('information_schema.columns')
    .select('table_name, column_name')
    .ilike('column_name', '%apellido1%');

  if (error) {
    console.log('Error searching columns:', error);
  } else {
    const tables = [...new Set(data.map(c => c.table_name))];
    console.log('Tables with "apellido1":', tables);
  }
}

findTable();
