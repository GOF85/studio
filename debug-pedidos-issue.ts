/**
 * Script de debug para investigar el problema de pedidos enviados
 * Ejecución: npx ts-node debug-pedidos-issue.ts
 * 
 * Este script:
 * 1. Conecta a Supabase
 * 2. Lista los esquemas de ambas tablas
 * 3. Busca tipos de datos de columnas críticas
 * 4. Verifica FK constraints
 * 5. Verifica RLS policies
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function debugPedidosIssue() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         DEBUG: Problema de Pedidos Enviados                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Verificar estructura de os_pedidos_pendientes
    console.log('📋 [1] Analizando os_pedidos_pendientes...');
    const { data: pendientesSchema, error: pendientesError } = await supabase
      .rpc('get_table_columns', { table_name: 'os_pedidos_pendientes' });
    
    if (pendientesError) {
      console.warn('    ⚠️  No se pudo obtener esquema (RPC no disponible)');
    } else {
      console.log('    Columnas encontradas:');
      if (Array.isArray(pendientesSchema)) {
        pendientesSchema.forEach((col: any) => {
          console.log(`      • ${col.column_name}: ${col.data_type} (null: ${col.is_nullable})`);
        });
      }
    }

    // 2. Verificar estructura de os_pedidos_enviados
    console.log('\n📋 [2] Analizando os_pedidos_enviados...');
    const { data: enviadosSchema, error: enviadosError } = await supabase
      .rpc('get_table_columns', { table_name: 'os_pedidos_enviados' });
    
    if (enviadosError) {
      console.warn('    ⚠️  No se pudo obtener esquema (RPC no disponible)');
    } else {
      console.log('    Columnas encontradas:');
      if (Array.isArray(enviadosSchema)) {
        enviadosSchema.forEach((col: any) => {
          console.log(`      • ${col.column_name}: ${col.data_type} (null: ${col.is_nullable})`);
        });
      }
    }

    // 3. Listar últimos pedidos pendientes
    console.log('\n📋 [3] Últimos 5 pedidos PENDIENTES:');
    const { data: ultimosPendientes, error: pendientesQueryError } = await supabase
      .from('os_pedidos_pendientes')
      .select('id, os_id, fecha_entrega, localizacion, proveedor_id')
      .order('created_at', { ascending: false })
      .limit(5);

    if (pendientesQueryError) {
      console.error('    ❌ Error:', pendientesQueryError.message);
    } else {
      if (ultimosPendientes && ultimosPendientes.length > 0) {
        ultimosPendientes.forEach((p: any) => {
          console.log(`    • ID: ${p.id}`);
          console.log(`      os_id: ${p.os_id} (tipo: ${typeof p.os_id})`);
          console.log(`      fecha: ${p.fecha_entrega}`);
          console.log(`      localización: ${p.localizacion}`);
        });
      } else {
        console.log('    ℹ️  No hay pedidos pendientes');
      }
    }

    // 4. Listar últimos pedidos enviados
    console.log('\n📋 [4] Últimos 5 pedidos ENVIADOS:');
    const { data: ultimosEnviados, error: enviadosQueryError } = await supabase
      .from('os_pedidos_enviados')
      .select('id, os_id, fecha_entrega, localizacion, estado')
      .order('created_at', { ascending: false })
      .limit(5);

    if (enviadosQueryError) {
      console.error('    ❌ Error:', enviadosQueryError.message);
    } else {
      if (ultimosEnviados && ultimosEnviados.length > 0) {
        ultimosEnviados.forEach((p: any) => {
          console.log(`    • ID: ${p.id}`);
          console.log(`      os_id: ${p.os_id} (tipo: ${typeof p.os_id})`);
          console.log(`      fecha: ${p.fecha_entrega}`);
          console.log(`      localización: ${p.localizacion}`);
          console.log(`      estado: ${p.estado}`);
        });
      } else {
        console.log('    ℹ️  No hay pedidos enviados');
      }
    }

    // 5. Verificar RLS Policies
    console.log('\n🔐 [5] Verificando RLS Policies...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies', { table_name: 'os_pedidos_enviados' });

      if (policiesError || !policies) {
        console.log('    ℹ️  RLS policies: No se pudo verificar con RPC');
        console.log('    ℹ️  (Verificar manualmente en Supabase Dashboard → Authentication → Policies)');
      } else {
        console.log('    Policies activas:', policies);
      }
    } catch (err) {
      console.log('    ℹ️  RLS policies: No se pudo verificar con RPC');
      console.log('    ℹ️  (Verificar manualmente en Supabase Dashboard → Authentication → Policies)');
    }

    // 6. Test simple: intentar insertar
    console.log('\n🧪 [6] Test de inserción...');
    const testData = {
      os_id: 'test-numero-expediente',
      tipo: 'Test',
      estado: 'Prueba',
      fecha_entrega: new Date().toISOString().split('T')[0],
      items: [],
    };

    console.log('    Intentando insertar registro de prueba...');
    console.log('    Datos:', testData);

    const { data: testInsert, error: testInsertError } = await supabase
      .from('os_pedidos_enviados')
      .insert(testData)
      .select()
      .single();

    if (testInsertError) {
      console.error('    ❌ Error al insertar:', {
        message: testInsertError.message,
        code: testInsertError.code,
        details: testInsertError.details,
        hint: testInsertError.hint,
      });
    } else {
      console.log('    ✅ Inserción exitosa! ID:', testInsert?.id);
      
      // Limpiar el registro de prueba
      await supabase
        .from('os_pedidos_enviados')
        .delete()
        .eq('id', testInsert.id);
      console.log('    ✓ Registro de prueba eliminado');
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    DEBUG COMPLETADO                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('📌 SIGUIENTES PASOS:');
    console.log('1. Ejecuta: npm run dev');
    console.log('2. Abre la consola del navegador (DevTools)');
    console.log('3. Ve a un OS con sub-pedidos pendientes');
    console.log('4. Haz click en "Enviar Sub-Pedidos"');
    console.log('5. Revisa:');
    console.log('   - Consola del navegador: logs del frontend');
    console.log('   - Terminal del servidor: logs del API route');
    console.log('6. Comparte los logs completos para análisis detallado\n');

  } catch (error: any) {
    console.error('❌ Error fatal:', error.message);
  }
}

debugPedidosIssue();
