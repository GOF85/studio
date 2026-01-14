import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const fixSQL = fs.readFileSync('./migrations/fix_column_names.sql', 'utf-8');
    
    // Split by ; to get individual statements
    const statements = fixSQL.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 80) + '...');
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('✓ Success');
      }
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
