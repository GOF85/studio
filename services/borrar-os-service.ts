import { SupabaseClient } from '@supabase/supabase-js';

export interface TableCount {
  table: string;
  count: number;
}

export async function getTableCounts(supabase: SupabaseClient, tables: string[]): Promise<TableCount[]> {
  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Error counting table ${table}:`, error);
        return { table, count: 0 };
      }
      
      return { table, count: count || 0 };
    })
  );
  
  return counts;
}

export async function getTableItems(supabase: SupabaseClient, table: string, idField: string = 'id', labelField: string = 'id'): Promise<any[]> {
  const { data, error } = await supabase
    .from(table)
    .select(`${idField}, ${labelField}`)
    .limit(1000); // Limit to avoid huge payloads

  if (error) {
    console.error(`Error fetching items from ${table}:`, error);
    return [];
  }

  return data || [];
}
