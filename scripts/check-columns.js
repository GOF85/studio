
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('Checking table: categorias_personal');
  
  const { data, error } = await supabase
    .from('categorias_personal')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error fetching from categorias_personal:', error);
  } else {
    console.log('Successfully connected to categorias_personal');
    console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Empty');
  }
}

checkColumns();
