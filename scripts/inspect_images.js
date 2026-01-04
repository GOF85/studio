const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    const { data, error } = await supabase
      .from('articulos')
      .select('id, nombre, imagen, imagenes')
      .limit(100);

    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }

    const entriesWithImages = (data || []).map(d => ({
      id: d.id,
      nombre: d.nombre,
      imagen: d.imagen || null,
      imagenes: d.imagenes || null
    }));

    console.log(JSON.stringify(entriesWithImages.slice(0, 100), null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

inspect();
