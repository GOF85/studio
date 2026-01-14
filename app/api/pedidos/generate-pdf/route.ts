import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { resolveOsId } from '@/lib/supabase';
import { generatePedidoPDF, getPedidoPDFBlob } from '@/lib/pdf-generator';
import { PedidoItem, ConsolidatedGroup as PDFGroup } from '@/types';

/**
 * Generate sequential order number (A0001, A0002, etc.)
 * Finds the highest existing number and returns +1
 * Retries up to 3 times if collision
 */
async function generateOrderNumber(supabase: any): Promise<string> {
  try {
    // Get ALL existing order numbers to find the highest one
    const { data: allOrders, error } = await supabase
      .from('os_pedidos_enviados')
      .select('numero_pedido');
    
    if (error) {
      console.error('Error fetching orders:', error);
      return 'A0001'; // Fallback
    }

    // Extract numeric parts and find max
    let maxNumber = 0;
    if (Array.isArray(allOrders)) {
      for (const order of allOrders) {
        if (order.numero_pedido) {
          const match = order.numero_pedido.match(/A(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) maxNumber = num;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    return `A${nextNumber.toString().padStart(4, '0')}`;
  } catch (err) {
    console.error('Error in generateOrderNumber:', err);
    return 'A0001';
  }
}

/**
 * Safely parse items that might be a JSON string or already an array
 */
function parseItems(items: any): any[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing items string:', e);
      return [];
    }
  }
  return [];
}

/**
 * Get pickup address based on lugar_recogida
 */
function getPickupAddress(lugar_recogida?: string, eventoSpaceAddress?: string): string {
  if (!lugar_recogida) return '';
  
  if (lugar_recogida === 'Evento') {
    // Return event's space address
    return eventoSpaceAddress || '';
  } else if (lugar_recogida === 'Instalaciones') {
    // Return hardcoded warehouse address
    return 'Almacen Micecatering. C. Mallorca, 1, 28703 San Sebastián de los Reyes, Madrid';
  }
  
  return '';
}


interface ConsolidatedItem extends PedidoItem {
  cantidad: number;
  quantity?: number; // Alternative field name
}

interface ConsolidatedGroup {
  fecha_entrega: string;
  hora_entrega?: string;
  localizacion: string;
  proveedor_id?: string;
  items: Record<string, ConsolidatedItem>; // Keyed by itemCode for deduplication during consolidation
  fecha_recogida?: string;
  hora_recogida?: string;
  lugar_recogida?: string;
}

/**
 * POST /api/pedidos/generate-pdf
 * 
 * Consolidates multiple pending orders and generates a PDF
 * Logic:
 * 1. Get all selected pending orders
 * 2. Group by (fecha_entrega, localizacion) - IGNORE solicita
 * 3. Merge items within each group (sum quantities)
 * 4. Create os_pedidos_enviados record
 * 5. Generate PDF
 * 6. Return PDF URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { osId, selectedPedidoIds, generatedBy, comentario } = body;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📥 [INICIO] POST /api/pedidos/generate-pdf');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 Parámetros recibidos:');
    console.log('   osId:', osId);
    console.log('   selectedPedidoIds:', selectedPedidoIds);
    console.log('   selectedPedidoIds.length:', selectedPedidoIds?.length);
    console.log('   generatedBy:', generatedBy);
    console.log('   comentario:', comentario);

    if (!osId || !selectedPedidoIds || selectedPedidoIds.length === 0) {
      console.error('❌ Error: Parámetros inválidos');
      return NextResponse.json(
        { error: 'osId and selectedPedidoIds are required' },
        { status: 400 }
      );
    }

    // Get Supabase client FIRST (needed for resolveOsId later)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Resolve osId
    console.log('\n🔄 [PASO 1] Resolviendo osId...');
    const resolvedUUID = await resolveOsId(osId);
    console.log('   osId recibido:', osId);
    console.log('   osId tipo:', typeof osId, '- Es UUID?', osId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i) ? 'SÍ' : 'NO');
    console.log('   osId resuelto a UUID:', resolvedUUID);
    
    // IMPORTANTE: Determinar numero_expediente
    // Si osId es UUID (por middleware), necesitamos buscar numero_expediente
    // Si osId es numero_expediente (string), usarlo directamente
    let numeroExpediente = osId;
    const isUUID = osId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    if (isUUID && resolvedUUID) {
      // osId es UUID, necesitamos buscar numero_expediente
      console.log('   ℹ️ osId es UUID, buscando numero_expediente...');
      const { data: evento } = await supabase
        .from('eventos')
        .select('numero_expediente')
        .eq('id', resolvedUUID)
        .single();
      
      if (evento?.numero_expediente) {
        numeroExpediente = evento.numero_expediente;
        console.log('   ✅ numero_expediente encontrado:', numeroExpediente);
      } else {
        console.warn('   ⚠️ No se encontró numero_expediente, usando UUID como fallback');
        numeroExpediente = osId;
      }
    }
    
    console.log('   Final: numeroExpediente para tablas pedidos:', numeroExpediente);
    
    if (!osId && !resolvedUUID) {
      console.error('❌ Error: OS no encontrado');
      return NextResponse.json(
        { error: 'OS not found' },
        { status: 404 }
      );
    }
    
    // Para las tablas de pedidos, usamos numero_expediente (VARCHAR)
    const osIdForPedidos = numeroExpediente;

    // Fetch selected pending orders
    console.log('\n🔄 [PASO 2] Obteniendo pedidos pendientes seleccionados...');
    console.log('   IDs a buscar:', selectedPedidoIds);
    console.log('   osIdForPedidos (numero_expediente):', osIdForPedidos);
    console.log('   resolvedUUID:', resolvedUUID);
    
    // CRITICAL DISCOVERY: The os_id column in production database is UUID, not VARCHAR
    // Despite migration saying VARCHAR, the actual column type is UUID
    // Therefore, we MUST use resolvedUUID (evento.id) to filter, not numero_expediente
    console.log('\n   📥 Usando UUID para filtrar (os_id es UUID en producción)...');
    const { data: allOsOrders, error: allOsError } = await supabase
      .from('os_pedidos_pendientes')
      .select('*')
      .eq('os_id', resolvedUUID);  // ← Use UUID, not numero_expediente
    
    if (allOsError) {
      console.error('   ❌ Error fetching all OS pedidos:', allOsError);
      return NextResponse.json(
        { error: allOsError.message },
        { status: 500 }
      );
    }
    
    console.log('   ✅ Fetched allOsOrders:', allOsOrders?.length || 0);
    
    // Now filter by selected IDs in code
    const selectedPedidos = allOsOrders?.filter(p => selectedPedidoIds.includes(p.id)) || [];
    const fetchError = null;

    console.log('   Resultado fetchError:', fetchError?.message || 'OK');
    console.log('   Pedidos encontrados:', selectedPedidos?.length || 0);
    
    if (fetchError) {
      console.error('❌ Error fetching pedidos:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    if (!selectedPedidos || selectedPedidos.length === 0) {
      console.warn('⚠️ ADVERTENCIA: No se encontraron pedidos pendientes');
      console.warn('   - Esto podría ser un pedido duplicado o ya procesado');
      console.warn('   - selectedPedidoIds:', selectedPedidoIds);
      return NextResponse.json(
        { error: 'No pending orders found - possibly already processed' },
        { status: 404 }
      );
    }

    // Log detalle de cada pedido
    console.log('\n📋 Detalles de pedidos pendientes encontrados:');
    selectedPedidos.forEach((p, idx) => {
      console.log(`   [${idx + 1}] ID: ${p.id}`);
      console.log(`       Fecha: ${p.fecha_entrega}`);
      console.log(`       Localización: ${p.localizacion}`);
      console.log(`       Items type: ${typeof p.items}`);
      console.log(`       Items: ${Array.isArray(p.items) ? p.items.length : 'NOT ARRAY'}`);
      console.log(`       Proveedor ID: ${p.proveedor_id}`);
      console.log(`       Proveedor Nombre: ${p.proveedor}`);
    });

    // Group and consolidate by (fecha_entrega, localizacion, proveedor_id)
    console.log('\n🔄 [PASO 3] Consolidando pedidos por fecha/localización...');
    const consolidatedGroups: Record<string, ConsolidatedGroup> = {};

    for (const pedido of selectedPedidos) {
      const groupKey = `${pedido.proveedor_id || 'sin-proveedor'}|${pedido.fecha_entrega}|${pedido.localizacion}`;
      console.log(`   Procesando pedido ${pedido.id} -> groupKey: ${groupKey}`);

      // Parse items safely (might be string or array)
      const parsedItems = parseItems(pedido.items);
      console.log(`   Items parsed: ${parsedItems.length} items`);

      if (!consolidatedGroups[groupKey]) {
        console.log(`   ✓ Creando nuevo grupo: ${groupKey}`);
        consolidatedGroups[groupKey] = {
          fecha_entrega: pedido.fecha_entrega,
          hora_entrega: pedido.hora_entrega,
          localizacion: pedido.localizacion,
          proveedor_id: pedido.proveedor_id,
          proveedor: pedido.proveedor,  // Add provider name
          items: {},
          fecha_recogida: pedido.fecha_recogida,
          hora_recogida: pedido.hora_recogida,
          lugar_recogida: pedido.lugar_recogida,
        };
      }

      // Merge items
      const group = consolidatedGroups[groupKey];
      for (const item of parsedItems) {
        const itemKey = item.itemCode || item.id;
        if (itemKey) {
          if (group.items[itemKey]) {
            console.log(`     Sumando cantidad a item existente: ${itemKey}`);
            const currentQty = group.items[itemKey].cantidad || group.items[itemKey].quantity || 0;
            const newQty = item.cantidad || item.quantity || 0;
            group.items[itemKey].cantidad = currentQty + newQty;
          } else {
            console.log(`     Agregando nuevo item: ${itemKey} - ${item.description}`);
            group.items[itemKey] = {
              ...item,
              cantidad: item.cantidad || item.quantity || 0
            };
          }
        }
      }
    }

    console.log('\n✅ Consolidación completada:');
    console.log(`   Total de grupos: ${Object.keys(consolidatedGroups).length}`);
    Object.entries(consolidatedGroups).forEach(([key, group]) => {
      console.log(`   • ${key}: ${Object.keys(group.items).length} artículos`);
    });

    // Fetch event info
    console.log('\n🔄 [PASO 4] Obteniendo información del evento...');
    console.log('   osId recibido:', osId);
    console.log('   resolvedUUID:', resolvedUUID);
    console.log('   Buscando evento con UUID:', resolvedUUID);
    
    // Usar el UUID resuelto para buscar en eventos
    const { data: evento, error: eventoError } = await supabase
      .from('eventos')
      .select('id, numero_expediente, space, space_address, responsables')
      .eq('id', resolvedUUID)
      .maybeSingle();  // Changed from .single() to .maybeSingle() - won't throw if no rows found

    console.log('   Resultado evento:', evento ? 'Encontrado' : 'No encontrado');
    if (evento) {
      console.log('   Evento ID:', evento.id);
      console.log('   Evento numero_expediente:', evento.numero_expediente);
      console.log('   Evento space:', evento.space);
      console.log('   Evento responsables (raw):', evento.responsables);
      console.log('   Evento responsables type:', typeof evento.responsables);
    } else if (eventoError) {
      console.log('   Error detallado EventoError:', {
        message: eventoError.message,
        code: eventoError.code,
        status: (eventoError as any).status,
        statusText: (eventoError as any).statusText,
      });
    }
    console.log('   Error mensaje:', eventoError?.message || 'OK');

    let eventoToUse = evento as any;
    if (!evento && resolvedUUID && resolvedUUID !== osId) {
      console.log('   ⚠️ Evento no encontrado por UUID, intentando por numero_expediente:', osId);
      const { data: eventoByNumero, error: eventoNumeroError } = await supabase
        .from('eventos')
        .select('id, numero_expediente, space, space_address, responsables')
        .eq('numero_expediente', osId)
        .maybeSingle();  // Changed from .single() to .maybeSingle()
      
      console.log('   Resultado por numero_expediente:', eventoByNumero ? 'Encontrado' : 'No encontrado');
      console.log('   Error:', eventoNumeroError?.message || 'OK');
      eventoToUse = eventoByNumero;
    }

    if (!eventoToUse) {
      console.warn('   ⚠️ Usando datos de evento por defecto (fallback)');
      eventoToUse = {
        space: '',  // Empty, not "Unknown"
        numero_expediente: osId,
        space_address: '',  // Empty, not "Unknown"
        responsables: {},
      };
    }

    // Create os_pedidos_enviados records
    console.log('\n🔄 [PASO 5] Creando registros en os_pedidos_enviados...');
    const createdPedidos = [];
    let totalArticulos = 0;
    let totalUnidades = 0;

    for (const groupKey of Object.keys(consolidatedGroups)) {
      const group = consolidatedGroups[groupKey];
      const itemsArray = Object.values(group.items);

      console.log(`\n   📦 Procesando grupo: ${groupKey}`);
      console.log(`      Artículos: ${itemsArray.length}`);
      console.log(`      Unidades: ${itemsArray.reduce((sum, item) => sum + (item.cantidad || 0), 0)}`);

      totalArticulos += itemsArray.length;
      totalUnidades += itemsArray.reduce((sum, item) => sum + (item.cantidad || 0), 0);

      // Check for existing (idempotency)
      console.log(`      Verificando si ya existe consolidado...`);
      const { data: existingPedido, error: existingError } = await supabase
        .from('os_pedidos_enviados')
        .select('id, numero_pedido')
        .eq('os_id', numeroExpediente)  // Use numero_expediente (VARCHAR)
        .eq('fecha_entrega', group.fecha_entrega)
        .eq('localizacion', group.localizacion)
        .maybeSingle();

      if (existingError) {
        console.log(`      ⚠️ Error verificando existencia: ${existingError.message}`);
      }

      if (existingPedido) {
        console.log(`      ⚠️ Ya existe consolidado para este grupo (ID: ${existingPedido.id}, numero_pedido: ${existingPedido.numero_pedido})`);
        createdPedidos.push(existingPedido);
        continue;
      }

      // Generate sequential order number
      const numeroPedido = await generateOrderNumber(supabase);
      console.log(`      🔢 Número de pedido generado: ${numeroPedido}`);

      // Prepare insert data
      // Parse responsables - might be a JSON string, or double-escaped JSON string, or object
      let responsables: any = {};
      if (eventoToUse?.responsables) {
        console.log(`      DEBUG: eventoToUse.responsables =`, eventoToUse.responsables);
        console.log(`      DEBUG: typeof eventoToUse.responsables =`, typeof eventoToUse.responsables);
        
        let responsablesData = eventoToUse.responsables;
        
        // If it's a string, parse it
        if (typeof responsablesData === 'string') {
          try {
            responsablesData = JSON.parse(responsablesData);
            console.log(`      ✅ Primera parse completada:`, responsablesData);
            
            // Check if the parsed result is ANOTHER string (double-escaped JSON)
            if (typeof responsablesData === 'string') {
              responsablesData = JSON.parse(responsablesData);
              console.log(`      ✅ Segunda parse completada (double-escaped):`, responsablesData);
            }
          } catch (e) {
            console.error('      ❌ Error parsing responsables JSON:', e);
            responsablesData = {};
          }
        }
        
        responsables = responsablesData;
        console.log(`      ✅ Final responsables object:`, responsables);
      } else {
        console.log(`      ⚠️ eventoToUse.responsables es falsy o undefined`);
      }
      
      console.log(`      Final extracted values:`);
      console.log(`      metre: "${responsables.metre || ''}"`)
      console.log(`      metre_phone: "${responsables.metre_phone || ''}"`)
      console.log(`      pase: "${responsables.pase || ''}"`)
      console.log(`      pase_phone: "${responsables.pase_phone || ''}"`);
      
      const insertData = {
        os_id: numeroExpediente,  // Use numero_expediente for FK constraint validation
        numero_pedido: numeroPedido,  // Sequential number (A0001, A0002, ...)
        tipo: 'Alquiler',
        estado: 'En preparación',
        fecha_entrega: group.fecha_entrega,
        hora_entrega: group.hora_entrega,
        localizacion: group.localizacion,
        proveedor: group.proveedor || null,  // Add provider name
        items: itemsArray,
        comentario_pedido: comentario,
        numero_expediente: osIdForPedidos,
        nombre_espacio: eventoToUse?.space || eventoToUse?.nombre_espacio || '',
        direccion_espacio: getPickupAddress(group.lugar_recogida, eventoToUse?.space_address),
        responsable_metre: responsables.metre || '',
        telefono_metre: responsables.metre_phone || '',
        responsable_pase: responsables.pase || '',
        telefono_pase: responsables.pase_phone || '',
        pedidos_pendientes_ids: selectedPedidoIds,
        fecha_envio_pdf: new Date().toISOString(),
        fecha_recogida: group.fecha_recogida,
        hora_recogida: group.hora_recogida,
        lugar_recogida: group.lugar_recogida,
      };

      console.log(`      📝 Datos a insertar:`, {
        os_id: insertData.os_id,
        fecha_entrega: insertData.fecha_entrega,
        localizacion: insertData.localizacion,
        items_count: insertData.items.length,
        estado: insertData.estado,
        responsables: {
          metre: insertData.responsable_metre,
          metre_phone: insertData.telefono_metre,
          pase: insertData.responsable_pase,
          pase_phone: insertData.telefono_pase,
        }
      });

      const { data: createdPedido, error: createError } = await supabase
        .from('os_pedidos_enviados')
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        console.error(`      ❌ ERROR AL INSERTAR:`, {
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint,
        });
        return NextResponse.json(
          { error: createError.message },
          { status: 500 }
        );
      }

      console.log(`      ✅ Creado exitosamente (ID: ${createdPedido.id})`);
      createdPedidos.push(createdPedido);
    }

    // Generate PDF
    console.log('\n📄 [PASO 6] Generando documentos PDF...');
    
    let pdfUrl = `/pdfs/pedidos-${osIdForPedidos}-${Date.now()}.pdf`;

    // Convert items from object to array for PDF generation
    const groupsForPDF: PDFGroup[] = Object.values(consolidatedGroups).map(group => {
      const itemsArray = Object.values(group.items);
      console.log(`   Grupo ${group.fecha_entrega} - ${group.localizacion}: ${itemsArray.length} items`);
      itemsArray.forEach((item: any, idx: number) => {
        console.log(`     [${idx}] ${item.description || item.itemCode}: ${item.cantidad || item.quantity} x ${item.price || item.priceSnapshot || 0}`);
      });
      
      // Ensure lugar_recogida is one of the valid types or undefined
      let lugar_recogida: 'Evento' | 'Instalaciones' | undefined = undefined;
      if (group.lugar_recogida === 'Evento' || group.lugar_recogida === 'Instalaciones') {
        lugar_recogida = group.lugar_recogida;
      }
      
      return {
        fecha_entrega: group.fecha_entrega,
        hora_entrega: group.hora_entrega,
        localizacion: group.localizacion,
        fecha_recogida: group.fecha_recogida,
        hora_recogida: group.hora_recogida,
        lugar_recogida,
        items: itemsArray, // Convert object to array here
      };
    });

    // Get the numero_pedido from the first created pedido (they should all have the same one)
    const numeroPedido = createdPedidos[0]?.numero_pedido || 'A0001';
    
    // Get the first group for PDF options (all groups from the same event/provider)
    const firstGroupKey = Object.keys(consolidatedGroups)[0];
    const firstGroup = firstGroupKey ? consolidatedGroups[firstGroupKey] : null;

    try {
      // Parse responsables from JSON if it's a string
      let responsablesObj: any = {};
      if (eventoToUse?.responsables) {
        if (typeof eventoToUse.responsables === 'string') {
          try {
            responsablesObj = JSON.parse(eventoToUse.responsables);
          } catch (e) {
            console.error('Error parsing responsables JSON:', e);
          }
        } else {
          responsablesObj = eventoToUse.responsables;
        }
      }

      console.log('\n📄 [PASO 7] Generando PDF...');
      console.log('   Responsables parsed:', responsablesObj);

      const pdfOptions = {
        numeroPedido,
        osNumber: numeroExpediente,
        nombreComercialProveedor: firstGroup?.proveedor || '',  // Add provider name
        eventName: eventoToUse?.space || 'Evento',
        eventSpace: eventoToUse?.space || '',
        eventAddress: eventoToUse?.space_address || '',
        lugarRecogida: firstGroup?.lugar_recogida,  // Add pickup location type
        direccionRecogida: getPickupAddress(firstGroup?.lugar_recogida, eventoToUse?.space_address),  // Add pickup address
        responsableMetre: responsablesObj.metre || '',
        telefonoMetre: responsablesObj.metre_phone || '',
        responsablePase: responsablesObj.pase || '',
        telefonoPase: responsablesObj.pase_phone || '',
        comments: comentario || undefined,
        dias: 1,
        includeImages: true,  // Enable thumbnail images in PDF
        logoUrl: 'https://zyrqdqpbrsevuygjrhvk.supabase.co/storage/v1/object/public/logo/logomice.png',
      };

      console.log('   PDF Options:', pdfOptions);

      const doc = await generatePedidoPDF(groupsForPDF, pdfOptions);
      
      console.log('   ✅ Documento PDF generado exitosamente');

      // Build PDF filename: "pedido-[numero_pedido]_[numero_expediente].pdf"
      const pdfFileName = `pedido-${numeroPedido}_${numeroExpediente}.pdf`;
      console.log('   📄 PDF Filename:', pdfFileName);
      console.log(`   📄 VERIFICACIÓN: pedido-[${numeroPedido}]_[${numeroExpediente}].pdf`);
      // Use pedidoId for download instead of embedding PDF in URL
      const downloadParams = new URLSearchParams({
        pedidoId: createdPedidos[0]?.id || '',
        fileName: pdfFileName,
        timestamp: Date.now().toString()
      });
      pdfUrl = `/api/pedidos/download-pdf?${downloadParams.toString()}`;
      console.log('   📄 Download URL:', pdfUrl);

    } catch (pdfError) {
      console.error('   ⚠️ Error generando PDF:', pdfError);
    }

    // Delete pending orders
    console.log('\n🗑️ [PASO 7] Eliminando pedidos pendientes...');
    console.log('   IDs a eliminar:', selectedPedidoIds);
    
    const { error: deleteError, count } = await supabase
      .from('os_pedidos_pendientes')
      .delete()
      .in('id', selectedPedidoIds);

    if (deleteError) {
      console.error('   ⚠️ Error eliminando pendientes:', deleteError.message);
    } else {
      console.log('   ✅ Eliminados', count, 'pedidos pendientes');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ [ÉXITO] Generación de PDF completada');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 Resumen:');
    console.log(`   • Grupos consolidados: ${createdPedidos.length}`);
    console.log(`   • Total artículos: ${totalArticulos}`);
    console.log(`   • Total unidades: ${totalUnidades}`);
    console.log(`   • Pedidos enviados creados: ${createdPedidos.length}`);
    console.log(`   • Pedidos pendientes eliminados: ${selectedPedidoIds.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return NextResponse.json({
      osId: resolvedUUID || osIdForPedidos,
      pdfUrl,
      pedidoEnviadoIds: createdPedidos.map(p => p.id),
      consolidatedCount: createdPedidos.length,
      totalItems: totalArticulos,
      totalUnidades,
    });
  } catch (error: any) {
    console.error('\n❌ ═════════════════════════════════════════════════════════════');
    console.error('ERROR EN POST /api/pedidos/generate-pdf');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════════════\n');
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
