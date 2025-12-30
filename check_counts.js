const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('entregas').select('count');
  if (error) {
    console.log('entregas table error:', error.message);
  } else {
    console.log('entregas table exists, count:', data);
  }
  
  const { data: data2, error: error2 } = await supabase.from('eventos').select('count');
  if (error2) {
    console.log('eventos table error:', error2.message);
  } else {
    console.log('eventos table exists, count:', data2);
  }
}

test();
