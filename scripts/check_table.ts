import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function checkTable() {
  const { data, error } = await supabase.from('pedido_plantillas').select('*').limit(1);
  if (error) {
    console.log('Table pedido_plantillas does not exist or error:', error.message);
  } else {
    console.log('Table pedido_plantillas exists');
  }
}

checkTable();
