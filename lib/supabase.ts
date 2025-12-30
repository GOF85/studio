import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Check .env.local');
}

// Create a singleton instance for browser usage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export function getSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Helper para resolver numero_expediente a UUID si es necesario
export async function resolveOsId(osId: string): Promise<string> {
    if (!osId) return '';
    // Si ya es un UUID, devolverlo
    if (osId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return osId;
    }
    
    // 1. Intentar en la tabla de eventos
    const { data: eventoData } = await supabase
        .from('eventos')
        .select('id')
        .eq('numero_expediente', osId)
        .maybeSingle();

    if (eventoData?.id) return eventoData.id;

    // 2. Intentar en la tabla de entregas
    const { data: entregaData } = await supabase
        .from('entregas')
        .select('id')
        .eq('numero_expediente', osId)
        .maybeSingle();

    if (entregaData?.id) return entregaData.id;

    return osId; // Devolver original si no se encuentra en ninguna
}
