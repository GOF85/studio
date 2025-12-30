const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('entregas')
    .select('id, numero_expediente, data')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Found', data?.length, 'records');
  data?.forEach(r => {
    console.log(`ID: ${r.id}, OS: ${r.numero_expediente}, Hitos: ${r.data?.hitos?.length || 0}`);
  });
}

test();
