
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    const { count: eventosCount, error: eventosError } = await supabase.from('eventos').select('*', { count: 'exact', head: true });
    if (eventosError) console.error('Error checking eventos:', eventosError.message);
    else console.log('Eventos count:', eventosCount);

    const { count: espaciosCount, error: espaciosError } = await supabase.from('espacios').select('*', { count: 'exact', head: true });
    if (espaciosError) console.error('Error checking espacios:', espaciosError.message);
    else console.log('Espacios (legacy) count:', espaciosCount);

    const { count: espaciosV2Count, error: espaciosV2Error } = await supabase.from('espacios_v2').select('*', { count: 'exact', head: true });
    if (espaciosV2Error) console.error('Error checking espacios_v2:', espaciosV2Error.message);
    else console.log('Espacios V2 count:', espaciosV2Count);
}

checkCounts();
