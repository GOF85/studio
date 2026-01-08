
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getColumns() {
  const { data, error } = await supabase.rpc('debug_sql', { 
    sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'personal_externo'" 
  });
  
  if (error) {
    // If debug_sql doesn't exist, try another approach
    console.log('debug_sql failed:', error.message);
    
    // Try to query directly if we have service role
    const { data: directData, error: directError } = await supabase
      .from('personal_externo')
      .select('*')
      .limit(0); 
      
    if (directError) {
      console.log('Generic query failed:', directError.message);
    } else {
      console.log('Query successful, but table is empty. No column info returned.');
    }
  } else {
    console.log('Columns for personal_externo:');
    console.table(data);
  }
}

getColumns();
