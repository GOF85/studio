
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  console.log('Inspecting categorias_personal...');
  const { data: catData, error: catError } = await supabase
    .from('categorias_personal')
    .select('*')
    .limit(1);
  
  if (catError) {
    console.error('Error fetching categorias_personal:', catError);
  } else {
    console.log('Columns in categorias_personal:', Object.keys(catData[0] || {}).join(', ') || 'No data to inspect columns');
  }

  console.log('\nInspecting personal_externo_catalogo...');
  const { data: pexData, error: pexError } = await supabase
    .from('personal_externo_catalogo')
    .select('*')
    .limit(1);

  if (pexError) {
      console.log('Table personal_externo_catalogo might not exist or error:', pexError.message);
  } else {
      console.log('Columns in personal_externo_catalogo:', Object.keys(pexData[0] || {}).join(', '));
  }
}

inspectSchema();
