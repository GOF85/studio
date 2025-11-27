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
            codfab: process.env.FACTUSOL_CODFAB || process.env.NEXT_PUBLIC_FACTUSOL_CODFAB || '',
            codcli: process.env.FACTUSOL_CODCLI || process.env.NEXT_PUBLIC_FACTUSOL_CODCLI || '',
            basedatos: process.env.FACTUSOL_BASEDATOS || process.env.NEXT_PUBLIC_FACTUSOL_BASEDATOS || '',
            password: process.env.FACTUSOL_PASSWORD || '', // Server-only, never NEXT_PUBLIC_
        }, debugLog);

        // 2. Fetch F_ART from Factusol with all relevant fields
        debugLog.push("Consultando F_ART en Factusol...");
        // Factusol column names: CODART, DESART, REFART, etc.
        const query = `
      SELECT 
        CODART, DESART, REFART, FAMART, PCOART, UELART, MEMART,
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
        const { data: proveedores } = await supabase.from('proveedores').select('id, nombre');

        const familiaMap = new Map(familias?.map(f => [f.codigo, { id: f.id, tipo: f.nombre, categoria: f.categoria_padre }]));
        const proveedorMap = new Map(proveedores?.map(p => [p.nombre, p.id]));

        // 4. Transform Data
        debugLog.push("Transformando datos...");
        const articulosToInsert = fArtData.map((item: any) => {
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
                nombre_proveedor: null, // No hay campo directo de proveedor en F_ART
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

        // Delete all existing records
        const { error: deleteError } = await supabase
            .from('articulos_erp')
            .delete()
            .gte('created_at', '1900-01-01'); // Always true condition to delete all

        if (deleteError) throw new Error(`Error borrando datos antiguos: ${deleteError.message}`);
        debugLog.push("Datos antiguos borrados.");

        // Insert in chunks (Supabase has limits on request size)
        const chunks = chunkArray(articulosToInsert, 100);
        let insertedCount = 0;

        for (const chunk of chunks) {
            const { error: insertError } = await supabase.from('articulos_erp').insert(chunk);
            if (insertError) {
                debugLog.push(`Error en chunk: ${insertError.message}`);
                throw new Error(`Error insertando bloque: ${insertError.message}`);
            }
            insertedCount += chunk.length;
            debugLog.push(`Insertados ${insertedCount}/${articulosToInsert.length} artículos...`);
        }

        debugLog.push(`✅ Sincronización completada. ${insertedCount} artículos insertados.`);

        return NextResponse.json({ success: true, count: insertedCount, debugLog });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debugLog.push(`❌ Error: ${errorMessage}`);
        return NextResponse.json({ success: false, error: errorMessage, debugLog }, { status: 500 });
    }
}
