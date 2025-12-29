const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    console.log('profiles table error:', error.message);
  } else {
    console.log('profiles table exists');
  }
  
  const { data: data2, error: error2 } = await supabase.from('perfiles').select('id').limit(1);
  if (error2) {
    console.log('perfiles table error:', error2.message);
  } else {
    console.log('perfiles table exists');
  }
}

test();
