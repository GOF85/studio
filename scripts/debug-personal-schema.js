
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPersonalSchema() {
    console.log('Checking columns for table "personal"...');
    
    // Attempt 1: Using a limit 1 query to inspect keys
    const { data, error } = await supabase.from('personal').select('*').limit(1);
    
    if (error) {
        console.error('Error fetching sample from "personal":', error);
        
        // Attempt 2: Try checking information_schema directly
        console.log('Trying to fetch from information_schema...');
        const { data: cols, error: colError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'personal');
            
        if (colError) {
            console.error('Error from information_schema:', colError);
        } else {
            console.log('Found columns via information_schema:', cols.map(c => c.column_name));
        }
    } else {
        if (data && data.length > 0) {
            console.log('Keys in "personal" record:', Object.keys(data[0]));
        } else {
            console.log('Table "personal" exists but is empty.');
             // Try checking information_schema if table is empty
            const { data: cols } = await supabase
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_name', 'personal');
            if (cols) {
                console.log('Found columns via information_schema:', cols.map(c => c.column_name));
            }
        }
    }
}

checkPersonalSchema();
