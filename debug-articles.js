const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  // Get one Alquiler article with imagenes
  const { data: articles, error } = await supabase
    .from('articulos')
    .select('id, nombre, categoria, subcategoria, tipo, imagenes')
    .eq('categoria', 'Alquiler')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('📋 Sample Alquiler Articles:');
  console.log(JSON.stringify(articles, null, 2));

  // Check the structure of one imagenes field
  if (articles && articles.length > 0) {
    const first = articles[0];
    console.log('\n📸 First article imagenes type:', typeof first.imagenes);
    console.log('Is array?', Array.isArray(first.imagenes));
    console.log('Imagenes value:', first.imagenes);
  }
}

debug();
