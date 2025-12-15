import { NextResponse } from 'next/server';
import { FactusolService } from '@/services/factusol-service';
import { supabase } from '@/lib/supabase';

// Helper to chunk array for batch processing
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

export async function POST() {
    const debugLog: string[] = [];

    try {
        debugLog.push("Iniciando sincronización de Artículos (F_ART)...");

        // 1. Initialize Factusol Service
        // Use server-side env vars (without NEXT_PUBLIC_ prefix for sensitive data)
        const factusolService = new FactusolService({
            codfab: '1078',
            codcli: '57237',
            basedatos: 'FS151',
            password: 'CBOgInVFmMLz',
        }, debugLog);

        // 2. Fetch F_ART from Factusol with all relevant fields
        debugLog.push("Consultando F_ART en Factusol...");
        // Factusol column names: CODART, DESART, REFART, etc.
        const query = `
      SELECT 
        CODART, DESART, REFART, FAMART, PHAART, PCOART, UELART, MEMART,
        DT0ART, CUCART, OBSART, STOART, CP1ART, CP2ART, CP3ART
      FROM F_ART
    `;
        const fArtData = await factusolService.executeQuery(query);

        debugLog.push(`Tipo de respuesta: ${typeof fArtData}`);
        debugLog.push(`Es array: ${Array.isArray(fArtData)}`);
        debugLog.push(`Longitud: ${fArtData?.length || 0}`);
        if (fArtData && fArtData.length > 0) {
            debugLog.push(`Primera fila (muestra): ${JSON.stringify(fArtData[0]).substring(0, 200)}...`);
        }

        if (!fArtData || fArtData.length === 0) {
            debugLog.push("⚠️ La consulta no devolvió registros. Verifica que:");
            debugLog.push("  - La tabla F_ART tenga datos en el ejercicio 2025");
            debugLog.push("  - Los nombres de columnas sean correctos");
            throw new Error("No se obtuvieron datos de F_ART.");
        }
        debugLog.push(`Obtenidos ${fArtData.length} artículos de Factusol.`);

        // 3. Fetch dependencies for mapping (Familias and Proveedores)
        debugLog.push("Cargando Familias y Proveedores de Supabase para mapeo...");
        const { data: familias } = await supabase.from('familias').select('id, codigo, nombre, categoria_padre');
        const { data: proveedores } = await supabase.from('proveedores').select('id, id_erp, nombre_comercial');

        debugLog.push(`Proveedores cargados: ${proveedores?.length || 0}`);
        if (proveedores && proveedores.length > 0) {
            debugLog.push(`Ejemplo de proveedor: id_erp="${proveedores[0].id_erp}", nombre="${proveedores[0].nombre_comercial}"`);
        }

        const familiaMap = new Map(familias?.map(f => [f.codigo, { id: f.id, tipo: f.nombre, categoria: f.categoria_padre }]));
        const proveedorMap = new Map(proveedores?.map((p: any) => [p.id_erp, { id: p.id, nombre: p.nombre_comercial }]));

        // 4. Transform Data
        debugLog.push("Transformando datos...");
        let proveedorMatchCount = 0;
        let proveedorNoMatchCount = 0;
        const phaartSamples: string[] = [];

        const articulosToInsert = fArtData.map((item: any, index: number) => {
            // Parse Factusol row structure: array of {columna, dato}
            const getVal = (colName: string) => {
                const cell = item.find((c: any) => c.columna === colName);
                return cell ? cell.dato : null;
            };

            // Factusol column mapping:
            // CODART = Código del artículo
            // DESART = Descripción
            // REFART = Referencia proveedor
            // FAMART = Familia
            // PHAART = Proveedor habitual
            // PCOART = Precio compra
            // MEMART = Merma
            // DT0ART = Descuento
            // CP1ART = Unidad de conversión
            // CP2ART = Formato (UD, KG, L)
            // CP3ART = Precio alquiler
            // OBSART = Observaciones
            // STOART = Stock mínimo

            const codArt = getVal('CODART');
            const famArt = getVal('FAMART');
            const pcoArt = parseFloat(getVal('PCOART') || '0');
            const dt0Art = parseFloat(getVal('DT0ART') || '0');
            const cp1Art = parseFloat(getVal('CP1ART') || '1'); // Unidad conversión
            const cp2Art = getVal('CP2ART'); // Formato
            const cp3Art = parseFloat(getVal('CP3ART') || '0'); // Precio alquiler

            // Get familia info for tipo and categoria_mice
            const familiaInfo = familiaMap.get(famArt);

            // Get provider info from PHAART
            const phaArtRaw = getVal('PHAART');
            // Convert to string and handle 0 (no provider in Factusol)
            const phaArt = (phaArtRaw && String(phaArtRaw) !== '0') ? String(phaArtRaw) : null;
            const proveedorInfo = phaArt ? proveedorMap.get(phaArt) : null;

            // Collect samples for logging (first 5 items)
            if (index < 5) {
                phaartSamples.push(`PHAART raw="${phaArtRaw}" converted="${phaArt}" -> ${proveedorInfo ? `Match: ${proveedorInfo.nombre}` : 'No match'}`);
            }

            if (proveedorInfo) {
                proveedorMatchCount++;
            } else if (phaArt) {
                proveedorNoMatchCount++;
            }

            // Map unidad_medida from CP2ART
            let unidadMedida = 'UD';
            if (cp2Art === 'KG' || cp2Art === 'KILO') unidadMedida = 'KG';
            else if (cp2Art === 'L' || cp2Art === 'LITRO') unidadMedida = 'L';

            // Calculate precio (coste por unidad base)
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
                precio: precio,
                precio_alquiler: cp3Art,
                unidad_medida: unidadMedida,
                merma_defecto: parseFloat(getVal('MEMART') || '0'),
                stock_minimo: parseFloat(getVal('STOART') || '0'),
                alquiler: cp3Art > 0, // Si tiene precio de alquiler, es artículo de alquiler
                observaciones: getVal('OBSART'),
            };
        });

        // 5. Transaction: Delete All and Insert
        debugLog.push("Iniciando transacción en Supabase...");

        // Store existing articles from database for comparison
        debugLog.push("Guardando artículos existentes para comparación...");
        const { data: existingArticulos } = await supabase
            .from('articulos_erp')
            .select('erp_id, precio');

        const existingPricesMap = new Map(
            (existingArticulos || []).map((a: any) => [a.erp_id, a.precio])
        );
        debugLog.push(`Artículos existentes en BD: ${existingArticulos?.length || 0}`);

        // Get the LAST recorded price from history for each article (to avoid duplicate changes)
        debugLog.push("Obteniendo últimos precios registrados del historial...");
        const { data: latestPrices } = await supabase
            .from('historico_precios_erp')
            .select('articulo_erp_id, precio_calculado')
            .order('fecha', { ascending: false });

        // Map: keep only the FIRST (most recent) price for each article
        const lastHistoricalPrices = new Map();
        if (latestPrices) {
            for (const record of latestPrices) {
                if (!lastHistoricalPrices.has(record.articulo_erp_id)) {
                    lastHistoricalPrices.set(record.articulo_erp_id, record.precio_calculado);
                }
            }
        }
        debugLog.push(`Precios históricos obtenidos: ${lastHistoricalPrices.size} artículos con historial`);

        // Debug specific article if requested (hardcoded for now or via header if we could)
        // We'll log details for a specific article if it exists in the new data
        const debugId = '1'; // Example ID, or we could look for one that changed
        const debugItem = articulosToInsert.find((a: any) => a.erp_id === debugId);
        if (debugItem) {
            const oldP = existingPricesMap.get(debugId);
            debugLog.push(`[DEBUG] Artículo ${debugId}: Precio anterior=${oldP}, Nuevo=${debugItem.precio}`);
        }

        // Insert or update in chunks (UPDATE + INSERT strategy)
        // This preserves foreign key relationships with ingredientes_internos
        debugLog.push("Sincronizando artículos (UPDATE + INSERT)...");
        
        const chunks = chunkArray(articulosToInsert, 200); // Optimized: 200 per chunk (was 50: 6100/200=31 lotes vs 122)
        let updatedCount = 0;
        let insertedCount = 0;

        debugLog.push(`Procesando ${chunks.length} lotes (200 art/lote) en paralelo (máx 4)...`);
        
        // Control concurrent execution: max 4 chunks at a time
        const MAX_CONCURRENT = 4;
        for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
            const batch = chunks.slice(i, i + MAX_CONCURRENT);
            const batchResults = await Promise.all(batch.map(async (chunk, batchIdx) => {
                const chunkNum = i + batchIdx + 1;
                
                // Separate articles into existing and new
                const existingIds = new Set(existingPricesMap.keys());
                const toUpdate = chunk.filter((a: any) => existingIds.has(a.erp_id));
                const toInsert = chunk.filter((a: any) => !existingIds.has(a.erp_id));

                let chunkUpdates = 0;
                let chunkInserts = 0;

                // Batch update existing articles in parallel
                if (toUpdate.length > 0) {
                    const updatePromises = toUpdate.map((article) =>
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
                    );

                    const updateResults = await Promise.all(updatePromises);
                    chunkUpdates = updateResults.filter(r => !r.error).length;
                }

                // Insert new articles in batch
                if (toInsert.length > 0) {
                    const { error: insertError } = await supabase
                        .from('articulos_erp')
                        .insert(toInsert);
                    
                    if (!insertError) {
                        chunkInserts = toInsert.length;
                    }
                }

                return { chunkNum, chunkUpdates, chunkInserts };
            }));

            // Accumulate results from this batch
            batchResults.forEach(({ chunkNum, chunkUpdates, chunkInserts }) => {
                updatedCount += chunkUpdates;
                insertedCount += chunkInserts;
                debugLog.push(`✓ Lote ${chunkNum}: ${chunkUpdates} actualizados, ${chunkInserts} nuevos`);
            });
        }

        debugLog.push(`✅ Sincronización completada. ${updatedCount} artículos actualizados, ${insertedCount} insertados.`);

        // Track price history
        debugLog.push("Registrando historial de precios...");
        const today = new Date().toISOString();
        const priceHistoryEntries = [];
        const priceChangesDetail = []; // Para mostrar detalles en logs

        for (const newArticulo of articulosToInsert) {
            const newPrice = newArticulo.precio;
            
            // Check if there's a price history for this article
            const historicalPrice = lastHistoricalPrices.get(newArticulo.erp_id);
            const currentDbPrice = existingPricesMap.get(newArticulo.erp_id);
            
            // Determine comparison price: historical if exists, otherwise current DB price
            const lastPrice = historicalPrice !== undefined ? historicalPrice : currentDbPrice;
            
            // Skip if price hasn't changed (including when prices are the same in DB)
            // Only register if: (1) it's a new article (no previous price), OR (2) price changed significantly
            if (lastPrice !== undefined && Math.abs(newPrice - lastPrice) < 0.001) {
                continue; // Price unchanged, skip registration
            }
            
            // Additional check: if article exists in DB and has the same price as before, skip it
            if (currentDbPrice !== undefined && historicalPrice === undefined && Math.abs(newPrice - currentDbPrice) < 0.001) {
                continue; // Price hasn't changed since last DB sync
            }

            // Price has changed or is new, register it
            const variacionPorcentaje = lastPrice && lastPrice !== 0
                ? ((newPrice - lastPrice) / Math.abs(lastPrice)) * 100 
                : 0;

            priceHistoryEntries.push({
                articulo_erp_id: newArticulo.erp_id,
                fecha: today,
                precio_calculado: newPrice,
                proveedor_id: newArticulo.proveedor_id,
                variacion_porcentaje: parseFloat(variacionPorcentaje.toFixed(2)),
            });

            // Guardar detalles para mostrar en logs (SOLO para cambios REALES, no los sin cambio)
            if (variacionPorcentaje !== 0 || lastPrice === undefined) {
                const priceDisplay = lastPrice !== undefined 
                    ? `€${lastPrice.toFixed(2)} → €${newPrice.toFixed(2)}`
                    : `€0.00 → €${newPrice.toFixed(2)} (NUEVO)`;
                const changeDisplay = lastPrice !== undefined
                    ? `${variacionPorcentaje > 0 ? '🔴 +' : variacionPorcentaje < 0 ? '🟢 ' : '➖ '}${Math.abs(variacionPorcentaje).toFixed(2)}%`
                    : '(Artículo nuevo en BD)';
                const formatted = `${newArticulo.nombre} (${newArticulo.erp_id}): ${priceDisplay} ${changeDisplay}`;
                priceChangesDetail.push(formatted);
            }
        }

        debugLog.push(`Total cambios detectados: ${priceHistoryEntries.length}`);
        
        // Mostrar detalles de cambios
        if (priceChangesDetail.length > 0) {
            debugLog.push("📊 Detalle de cambios de precio:");
            priceChangesDetail.forEach(change => {
                debugLog.push(`  ${change}`);
            });
        }

        if (priceHistoryEntries.length > 0) {
            const historyChunks = chunkArray(priceHistoryEntries, 500); // Batch larger chunks for price history
            let historyInserted = 0;

            // Insert price history in parallel (max 3 concurrent)
            for (let i = 0; i < historyChunks.length; i += 3) {
                const batch = historyChunks.slice(i, i + 3);
                const insertResults = await Promise.all(
                    batch.map(chunk =>
                        supabase
                            .from('historico_precios_erp')
                            .insert(chunk)
                    )
                );

                insertResults.forEach((result, idx) => {
                    if (result.error) {
                        debugLog.push(`⚠️ Lote ${i + idx + 1}: Error registrando historial: ${result.error.message}`);
                    } else {
                        historyInserted += batch[idx].length;
                    }
                });
            }
            debugLog.push(`✅ Registrados ${historyInserted} cambios de precio en el historial.`);
        } else {
            debugLog.push("✓ No se detectaron cambios de precio en esta sincronización.");
        }

        return NextResponse.json({ success: true, count: updatedCount + insertedCount, priceChanges: priceHistoryEntries.length, debugLog });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debugLog.push(`❌ Error: ${errorMessage}`);
        return NextResponse.json({ success: false, error: errorMessage, debugLog }, { status: 500 });
    }
}
