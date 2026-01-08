
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const testData = {
    id: 'TEST-123',
    proveedor_id: 'TEST-PROV',
    nombre: 'Test',
    apellido1: 'Externo',
    nombre_completo: 'Test Externo',
    nombre_compacto: 'Test Ext',
    telefono: '123456789',
    email: 'test@example.com'
  };

  console.log('Testing insert into personal_externo...');
  const { data, error } = await supabase
    .from('personal_externo')
    .insert([testData])
    .select();

  if (error) {
    console.log('Insert failed:', error.message);
    console.log('Error details:', error.details);
  } else {
    console.log('Insert successful! Data:', data);
    // Cleanup
    await supabase.from('personal_externo').delete().eq('id', 'TEST-123');
  }
}

testInsert();
