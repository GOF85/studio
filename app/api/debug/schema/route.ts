import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  const { data: cols, error: colError } = await supabase
    .from('information_schema.columns' as any)
    .select('column_name, data_type')
    .eq('table_name', 'eventos');

  // Also check if respMetre or respCocinaPase exist
  const legacyCols = cols?.filter((c: any) => 
    ['respMetre', 'respCocinaPase', 'metre_responsable', 'jefe_cocina'].includes(c.column_name)
  );

  return NextResponse.json({ 
    all_columns: cols?.map((c: any) => c.column_name),
    legacy_check: legacyCols,
    error: colError 
  });
}
