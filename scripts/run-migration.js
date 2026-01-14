#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Read the SQL migration file
const sqlFilePath = path.join(__dirname, 'migrations', '002_fix_column_names.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

console.log('📝 SQL file loaded:', sqlFilePath);
console.log('🔧 Executing migration...\n');

// Execute via Supabase REST API
async function runMigration() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        sql: sql,
      }),
    });

    console.log('Response status:', response.status);
    const data = await response.text();
    
    if (response.ok || response.status === 204) {
      console.log('✅ Migration executed successfully!');
    } else {
      console.error('❌ Migration failed:');
      console.error('Status:', response.status);
      console.error('Response:', data);
    }
  } catch (error) {
    console.error('❌ Error executing migration:', error.message);
    
    console.log('\n📋 MANUAL EXECUTION INSTRUCTIONS:');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Create new query');
    console.log('5. Copy content from: migrations/002_fix_column_names.sql');
    console.log('6. Run the query');
    process.exit(1);
  }
}

runMigration();
