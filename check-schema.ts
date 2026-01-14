import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function checkSchema() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Query information_schema to get actual column types
  const { data, error } = await supabase.rpc('sql', {
    query: `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'os_pedidos_pendientes'
      ORDER BY ordinal_position;
    `,
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('os_pedidos_pendientes columns:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkSchema().catch(console.error);
