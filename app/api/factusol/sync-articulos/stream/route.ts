import { NextResponse } from 'next/server';
import { FactusolService } from '@/services/factusol-service';
import { supabase } from '@/lib/supabase';

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunked.push(array.slice(i, i + size));
  return chunked;
}

const normalizePrice = (price: number | null | undefined) => {
  return Math.round(((price ?? 0) + Number.EPSILON) * 100) / 100;
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let logLines: string[] = [];
      const write = (line: string) => {
        logLines.push(line);
        controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      };
      const event = (name: string, payload: any) => {
        controller.enqueue(encoder.encode(`event: ${name}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      (async () => {
        const startTime = Date.now();
        const debug = (msg: string) => write(msg);
        let syncLogId: string | null = null;
        let syncStatus: string = 'success';
        try {
          debug('Iniciando sincronización de Artículos (F_ART)...');

          const factusolService = new FactusolService({
            codfab: '1078',
            codcli: '57237',
            basedatos: 'FS151',
            password: 'CBOgInVFmMLz',
          }, []);

          debug('Consultando F_ART en Factusol...');
          const query = `\n      SELECT \n        CODART, DESART, REFART, FAMART, PHAART, PCOART, UELART, MEMART,\n        DT0ART, CUCART, OBSART, STOART, CP1ART, CP2ART, CP3ART\n      FROM F_ART\n    `;
          const fArtData = await factusolService.executeQuery(query);
          debug(`Tipo de respuesta: ${typeof fArtData}`);
          debug(`Es array: ${Array.isArray(fArtData)}`);
          debug(`Longitud: ${fArtData?.length || 0}`);
          if (fArtData && fArtData.length > 0) {
            debug(`Primera fila (muestra): ${JSON.stringify(fArtData[0]).substring(0, 200)}...`);
          }
          if (!fArtData || fArtData.length === 0) throw new Error('No se obtuvieron datos de F_ART.');
          debug(`Obtenidos ${fArtData.length} artículos de Factusol.`);

          debug('Cargando Familias y Proveedores de Supabase para mapeo...');
          const { data: familias } = await supabase.from('familias').select('id, codigo, nombre, categoria_padre');
          const { data: proveedores } = await supabase.from('proveedores').select('id, id_erp, nombre_comercial');
          debug(`Proveedores cargados: ${proveedores?.length || 0}`);
          if (proveedores && proveedores.length > 0) {
            debug(`Ejemplo de proveedor: id_erp="${proveedores[0].id_erp}", nombre="${proveedores[0].nombre_comercial}"`);
          }

          const familiaMap = new Map(familias?.map(f => [f.codigo, { id: f.id, tipo: f.nombre, categoria: f.categoria_padre }]));
          const proveedorMap = new Map(proveedores?.map((p: any) => [p.id_erp, { id: p.id, nombre: p.nombre_comercial }]));

          debug('Transformando datos...');
          let proveedorMatchCount = 0;
          let proveedorNoMatchCount = 0;
          const articulosToInsert = fArtData.map((item: any) => {
            const getVal = (colName: string) => {
              const cell = item.find((c: any) => c.columna === colName);
              return cell ? cell.dato : null;
            };
            const codArt = getVal('CODART');
            const famArt = getVal('FAMART');
            const pcoArt = parseFloat(getVal('PCOART') || '0');
            const dt0Art = parseFloat(getVal('DT0ART') || '0');
            const cp1Art = parseFloat(getVal('CP1ART') || '1');
            const cp2Art = getVal('CP2ART');
            const cp3Art = parseFloat(getVal('CP3ART') || '0');
            const familiaInfo = familiaMap.get(famArt);
            const phaArtRaw = getVal('PHAART');
            const phaArt = (phaArtRaw && String(phaArtRaw) !== '0') ? String(phaArtRaw) : null;
            const proveedorInfo = phaArt ? proveedorMap.get(phaArt) : null;
            if (proveedorInfo) proveedorMatchCount++; else if (phaArt) proveedorNoMatchCount++;
            let unidadMedida = 'UD';
            if (cp2Art === 'KG' || cp2Art === 'KILO') unidadMedida = 'KG';
            else if (cp2Art === 'L' || cp2Art === 'LITRO') unidadMedida = 'L';
            const precio = cp1Art > 0 ? (pcoArt * (1 - dt0Art / 100)) / cp1Art : 0;
            return {
              erp_id: codArt,
              nombre: getVal('DESART') || 'Sin Nombre',
              referencia_proveedor: getVal('REFART'),
              proveedor_id: proveedorInfo?.id || null,
              nombre_proveedor: proveedorInfo?.nombre || null,
              familia_id: familiaInfo?.id || null,
              familia_categoria: famArt,
              tipo: familiaInfo?.tipo || null,
              categoria_mice: familiaInfo?.categoria || null,
              precio_compra: pcoArt,
              descuento: dt0Art,
              unidad_conversion: cp1Art,
              precio,
              precio_alquiler: cp3Art,
              unidad_medida: unidadMedida,
              merma_defecto: parseFloat(getVal('MEMART') || '0'),
              stock_minimo: parseFloat(getVal('STOART') || '0'),
              alquiler: cp3Art > 0,
              observaciones: getVal('OBSART'),
            };
          });

          debug('Guardando artículos existentes para comparación...');
          const { data: existingArticulos } = await supabase
            .from('articulos_erp')
            .select('erp_id, precio');
          const existingPricesMap = new Map((existingArticulos || []).map((a: any) => [a.erp_id, a.precio]));
          debug(`Artículos existentes en BD: ${existingArticulos?.length || 0}`);

          debug('Obteniendo últimos precios registrados del historial...');
          const { data: latestPrices } = await supabase
            .from('historico_precios_erp')
            .select('articulo_erp_id, precio_calculado')
            .order('fecha', { ascending: false });
          const lastHistoricalPrices = new Map();
          if (latestPrices) {
            for (const record of latestPrices) {
              if (!lastHistoricalPrices.has(record.articulo_erp_id)) {
                lastHistoricalPrices.set(record.articulo_erp_id, record.precio_calculado);
              }
            }
          }
          debug(`Precios históricos obtenidos: ${lastHistoricalPrices.size} artículos con historial`);

          debug('Sincronizando artículos (UPDATE + INSERT)...');
          const chunks = chunkArray(articulosToInsert, 200);
          let updatedCount = 0;
          let insertedCount = 0;
          debug(`Procesando ${chunks.length} lotes (200 art/lote) en paralelo (máx 4)...`);
          const MAX_CONCURRENT = 4;
          for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
            const batch = chunks.slice(i, i + MAX_CONCURRENT);
            const batchResults = await Promise.all(batch.map(async (chunk, batchIdx) => {
              const chunkNum = i + batchIdx + 1;
              const existingIds = new Set(existingPricesMap.keys());
              const toUpdate = chunk.filter((a: any) => existingIds.has(a.erp_id));
              const toInsert = chunk.filter((a: any) => !existingIds.has(a.erp_id));
              let chunkUpdates = 0;
              let chunkInserts = 0;
              if (toUpdate.length > 0) {
                const updateResults = await Promise.all(toUpdate.map((article) =>
                  supabase
                    .from('articulos_erp')
                    .update({
                      nombre: article.nombre,
                      referencia_proveedor: article.referencia_proveedor,
                      proveedor_id: article.proveedor_id,
                      nombre_proveedor: article.nombre_proveedor,
                      familia_id: article.familia_id,
                      familia_categoria: article.familia_categoria,
                      tipo: article.tipo,
                      categoria_mice: article.categoria_mice,
                      precio_compra: article.precio_compra,
                      descuento: article.descuento,
                      unidad_conversion: article.unidad_conversion,
                      precio: article.precio,
                      precio_alquiler: article.precio_alquiler,
                      unidad_medida: article.unidad_medida,
                      merma_defecto: article.merma_defecto,
                      stock_minimo: article.stock_minimo,
                      alquiler: article.alquiler,
                      observaciones: article.observaciones,
                    })
                    .eq('erp_id', article.erp_id)
                ));
                chunkUpdates = updateResults.filter(r => !r.error).length;
              }
              if (toInsert.length > 0) {
                const { error: insertError } = await supabase
                  .from('articulos_erp')
                  .insert(toInsert);
                if (!insertError) chunkInserts = toInsert.length;
              }
              return { chunkNum, chunkUpdates, chunkInserts };
            }));
            batchResults.forEach(({ chunkNum, chunkUpdates, chunkInserts }) => {
              updatedCount += chunkUpdates;
              insertedCount += chunkInserts;
              debug(`✓ Lote ${chunkNum}: ${chunkUpdates} actualizados, ${chunkInserts} nuevos`);
            });
          }
          debug(`✅ Sincronización completada. ${updatedCount} artículos actualizados, ${insertedCount} insertados.`);

          debug('Registrando historial de precios...');
          const today = new Date().toISOString();
          const priceHistoryEntries: any[] = [];
          const priceChangesDetail: string[] = [];
          for (const newArticulo of articulosToInsert) {
            const newPrice = normalizePrice(newArticulo.precio);
            const historicalPrice = lastHistoricalPrices.get(newArticulo.erp_id);
            const currentDbPrice = existingPricesMap.get(newArticulo.erp_id);
            const lastPrice = historicalPrice !== undefined ? normalizePrice(historicalPrice) : (currentDbPrice !== undefined ? normalizePrice(currentDbPrice) : undefined);
            if (lastPrice !== undefined && newPrice === lastPrice) continue;
            if (lastPrice === undefined && newPrice === 0) continue;
            if (lastPrice !== undefined) {
              const variacionPorcentaje = lastPrice && lastPrice !== 0 ? ((newPrice - lastPrice) / Math.abs(lastPrice)) * 100 : 0;
              priceHistoryEntries.push({
                articulo_erp_id: newArticulo.erp_id,
                fecha: today,
                precio_calculado: newPrice,
                proveedor_id: newArticulo.proveedor_id,
                variacion_porcentaje: parseFloat(variacionPorcentaje.toFixed(2)),
              });
              const priceDisplay = `€${lastPrice.toFixed(2)} → €${newPrice.toFixed(2)}`;
              const changeDisplay = `${variacionPorcentaje > 0 ? '🔴 +' : variacionPorcentaje < 0 ? '🟢 ' : '➖ '}${Math.abs(variacionPorcentaje).toFixed(2)}%`;
              const formatted = `${newArticulo.nombre} (${newArticulo.erp_id}): ${priceDisplay} ${changeDisplay}`;
              priceChangesDetail.push(formatted);
            }
          }
          debug(`Total cambios detectados: ${priceHistoryEntries.length}`);
          if (priceChangesDetail.length > 0) {
            debug('📊 Detalle de cambios de precio:');
            priceChangesDetail.forEach(change => debug(`  ${change}`));
          }
          if (priceHistoryEntries.length > 0) {
            const historyChunks = chunkArray(priceHistoryEntries, 500);
            let historyInserted = 0;
            for (let i = 0; i < historyChunks.length; i += 3) {
              const batch = historyChunks.slice(i, i + 3);
              const insertResults = await Promise.all(batch.map(chunk => supabase.from('historico_precios_erp').insert(chunk)));
              insertResults.forEach((result, idx) => {
                if (result.error) debug(`⚠️ Lote ${i + idx + 1}: Error registrando historial: ${result.error.message}`);
                else historyInserted += batch[idx].length;
              });
            }
            debug(`✅ Registrados ${historyInserted} cambios de precio en el historial.`);
          } else {
            debug('✓ No se detectaron cambios de precio en esta sincronización.');
          }

          // Emit final result event for the client to act (reload, toast, etc.)
          // Guardar log en la BD
          const { data: logInsert, error: logError } = await supabase
            .from('sync_logs')
            .insert({
              type: 'articulos',
              status: 'success',
              log: logLines.join('\n'),
              duration_ms: Date.now() - startTime,
              extra: { count: articulosToInsert.length, priceChanges: priceHistoryEntries.length }
            })
            .select('id')
            .single();
          syncLogId = logInsert?.id || null;
          event('result', { success: true, count: (articulosToInsert.length), priceChanges: (priceHistoryEntries.length), logId: syncLogId });
          event('end', { done: true });
          controller.close();
        } catch (error: any) {
          syncStatus = 'error';
          write(`❌ Error: ${error?.message || String(error)}`);
          // Guardar log de error en la BD
          const { data: logInsert, error: logError } = await supabase
            .from('sync_logs')
            .insert({
              type: 'articulos',
              status: 'error',
              log: logLines.join('\n'),
              duration_ms: Date.now() - startTime,
              extra: { error: error?.message || String(error) }
            })
            .select('id')
            .single();
          syncLogId = logInsert?.id || null;
          event('result', { success: false, error: error?.message || String(error), logId: syncLogId });
          event('end', { done: true });
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
