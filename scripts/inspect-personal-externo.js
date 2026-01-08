
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
  console.log('Inspecting columns of personal_externo...');
  // Since we can't use information_schema easily, let's try common column names
  const columns = ['id', 'proveedor_id', 'nombre', 'apellido1', 'apellido2', 'nombre_completo', 'nombre_compacto', 'telefono', 'email', 'created_at'];
  
  for (const col of columns) {
    const { error } = await supabase.from('personal_externo').select(col).limit(0);
    if (error) {
      console.log(`Column ${col}: MISSING (${error.message})`);
    } else {
      console.log(`Column ${col}: EXISTS`);
    }
  }
}

inspectTable();
