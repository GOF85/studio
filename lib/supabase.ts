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
    if (!osId) {
        return '';
    }
    
    // Si ya es un UUID, devolverlo
    if (osId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return osId;
    }
    // 1. Intentar en la tabla de eventos
    const { data: eventoData, error: eventoError } = await supabase
        .from('eventos')
        .select('id')
        .eq('numero_expediente', osId)
        .maybeSingle();

    if (eventoData?.id) {
        return eventoData.id;
    }
    const { data: entregaData, error: entregaError } = await supabase
        .from('entregas')
        .select('id')
        .eq('numero_expediente', osId)
        .maybeSingle();

    if (entregaData?.id) {
        return entregaData.id;
    }
    return osId; // Devolver original si no se encuentra en ninguna
}

// Helper para verificar si un string es un UUID válido
const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// Construye una expresión segura para PostgREST `.or()` cuando se busca por OS.
// Si `targetId` es distinto del `osId` (es decir, se resolvió a UUID), retorna
// `os_id.eq.<uuid>,os_id.eq.<original>` para abarcar ambos casos, pero solo si original es UUID
// para evitar Error 400 en columnas de tipo UUID.
export function buildOsOr(osId: string, targetId: string) {
    if (!osId) return '';
    if (targetId && targetId !== osId) {
        // Solo incluimos osId si también es un UUID válido para evitar error 400 en columnas UUID
        if (isUuid(osId)) {
            return `os_id.eq.${targetId},os_id.eq.${osId}`;
        }
        return `os_id.eq.${targetId}`;
    }
    return `os_id.eq.${targetId}`;
}

// Generic builder for PostgREST `.or()` expressions for a given field.
// field: the DB column to compare (eg 'os_id' or 'evento_id')
// osId: original identifier passed by the UI (could be UUID or numero_expediente)
// targetId: resolved UUID (or same as osId if not resolved)
export function buildFieldOr(field: string, osId: string, targetId: string) {
    if (!osId) return '';
    if (targetId && targetId !== osId) {
        // Solo incluimos osId si también es un UUID válido para evitar error 400 en columnas UUID
        if (isUuid(osId)) {
            return `${field}.eq.${targetId},${field}.eq.${osId}`;
        }
        return `${field}.eq.${targetId}`;
    }
    return `${field}.eq.${targetId}`;
}
