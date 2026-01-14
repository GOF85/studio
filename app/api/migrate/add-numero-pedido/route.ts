// File: /app/api/migrate/add-numero-pedido/route.ts
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
    console.log('[Migrate API] Starting migration to add numero_pedido column...')

    // Check if column already exists by querying it
    const { error: checkError } = await supabase
      .from('os_pedidos_enviados')
      .select('numero_pedido')
      .limit(1)

    if (!checkError) {
      console.log('[Migrate API] Column numero_pedido already exists')
      return NextResponse.json({
        success: true,
        message: 'Column numero_pedido already exists',
        status: 'complete'
      })
    }

    // If column doesn't exist, we need to create it manually
    console.log('[Migrate API] Column does not exist, needs manual creation')
    
    return NextResponse.json(
      {
        error: 'Column numero_pedido does not exist',
        message: 'The column needs to be created manually in Supabase SQL Editor',
        instructions: [
          '1. Go to Supabase Dashboard',
          '2. Select your project',
          '3. Go to SQL Editor',
          '4. Run this SQL:',
          'ALTER TABLE os_pedidos_enviados ADD COLUMN IF NOT EXISTS numero_pedido VARCHAR(10);',
          'CREATE INDEX IF NOT EXISTS idx_os_pedidos_enviados_numero_pedido ON os_pedidos_enviados(numero_pedido);',
          'ALTER TABLE os_pedidos_enviados ADD CONSTRAINT unique_numero_pedido UNIQUE (numero_pedido);',
        ],
        status: 'needs_manual_creation'
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[Migrate API] Error:', error)
    return NextResponse.json(
      {
        error: 'Migration failed',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[Migrate API] Checking migration status...')

    // Check if column exists
    const { error: checkError } = await supabase
      .from('os_pedidos_enviados')
      .select('numero_pedido')
      .limit(1)

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'Column numero_pedido exists',
        status: 'complete'
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Column numero_pedido does not exist',
      status: 'needs_migration'
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Check failed',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
