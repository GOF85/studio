const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sqlPath = path.join(__dirname, 'migrations', '20260119_fix_pes_logic.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function runMigration() {
  console.log('📄 Executing migration via JS...');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ Error executing migration:', error);
    process.exit(1);
  }
  
  console.log('✓ Migration executed successfully!');
  console.log(data);
}

runMigration();
