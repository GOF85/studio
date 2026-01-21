// File: /app/api/migrate/add-proveedor-column/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('[Migrate API] Starting migration to add proveedor_id column...')

    // Check if column already exists
    const { data: existingColumns, error: checkError } = await supabase.rpc(
      'get_table_columns',
      { table_name: 'os_pedidos_pendientes' }
    );

    // Try direct approach: use supabase admin API
    // First, attempt to add the column by trying to query it
    // If it fails, we know we need to add it

    // Insert a test record with proveedor_id to trigger the migration
    console.log('[Migrate API] Checking if proveedor_id column exists...')
    
    const { error: testError } = await supabase
      .from('os_pedidos_pendientes')
      .select('proveedor_id')
      .limit(1)

    if (testError && testError.message.includes('proveedor_id')) {
      console.log('[Migrate API] Column does not exist, attempting via Supabase admin...')
      
      // The column needs to be created manually in Supabase
      return NextResponse.json(
        {
          error: 'Column proveedor_id does not exist',
          message: 'The column needs to be created manually in Supabase SQL Editor',
          instructions: [
            '1. Go to Supabase Dashboard',
            '2. Select your project',
            '3. Go to SQL Editor',
            '4. Run this SQL:',
            'ALTER TABLE os_pedidos_pendientes ADD COLUMN proveedor_id VARCHAR REFERENCES proveedores(id) ON DELETE RESTRICT;',
            'CREATE INDEX idx_os_pedidos_pendientes_proveedor_id ON os_pedidos_pendientes(proveedor_id);',
          ],
          details: testError,
        },
        { status: 400 }
      )
    }

    console.log('[Migrate API] Column already exists or check passed!')
    return NextResponse.json(
      {
        success: true,
        message: 'proveedor_id column exists',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Migrate API] Exception:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

