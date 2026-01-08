const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Environment variables are missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const tables = ['categorias_personal', 'personal_externo_tipos', 'proveedores_tipos_servicio', 'personal_externo_catalogo'];
    
    for (const table of tables) {
        console.log(`Checking table "${table}"...`);
        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.log(`Table "${table}" error:`, error.message);
        } else {
            console.log(`Table "${table}" exists. Row count: ${count}`);
            
            // Try information_schema since it might be a view
            const { data: cols } = await supabase
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_name', table);
            
            if (cols && cols.length > 0) {
                console.log(`Columns in "${table}" (from info_schema):`, cols.map(c => c.column_name));
            } else {
                // Try a direct select if info_schema failed (usually due to permissions)
                const { data: sample } = await supabase.from(table).select('*').limit(1);
                if (sample && sample.length > 0) {
                    console.log(`Columns in "${table}" (from select):`, Object.keys(sample[0]));
                } else {
                    console.log(`Could not retrieve columns for "${table}" (might be empty and no info_schema access)`);
                }
            }
        }
        console.log('---');
    }
}

checkTables();
