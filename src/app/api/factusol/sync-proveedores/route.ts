import { NextResponse } from 'next/server';
import { FactusolService } from '@/services/factusol-service';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST() {
    const debugLog: string[] = [];

    try {
        debugLog.push("Iniciando sincronización de Proveedores (F_PRO)...");

        // 1. Initialize Factusol Service
        // Use server-side env vars (without NEXT_PUBLIC_ prefix for sensitive data)
        const factusolService = new FactusolService({
            codfab: '1078',
            codcli: '57237',
            basedatos: 'FS150',
            password: 'AiQe4HeWrj6Q',
        }, debugLog);

        // 2. Fetch F_PRO from Factusol
        debugLog.push("Consultando F_PRO en Factusol...");
        // Factusol column names: CODPRO, NOFPRO, NOCPRO, NIFPRO, DOMPRO, POBPRO, CPOPRO, PROPRO, TELPRO, EMAPRO, PCOPRO, FPAPRO, ENTPRO, OFIPRO, DCOPRO, CUEPRO
        const query = `
      SELECT 
        CODPRO, NOFPRO, NOCPRO, NIFPRO, DOMPRO, POBPRO, CPOPRO, PROPRO, TELPRO, EMAPRO,
        PCOPRO, FPAPRO, ENTPRO, OFIPRO, DCOPRO, CUEPRO
      FROM F_PRO
    `;
        const fProData = await factusolService.executeQuery(query);

        debugLog.push(`Tipo de respuesta: ${typeof fProData}`);
        debugLog.push(`Es array: ${Array.isArray(fProData)}`);
        debugLog.push(`Longitud: ${fProData?.length || 0}`);

        if (!fProData || fProData.length === 0) {
            debugLog.push("⚠️ La consulta no devolvió registros.");
            throw new Error("No se obtuvieron datos de F_PRO.");
        }
        debugLog.push(`Obtenidos ${fProData.length} proveedores de Factusol.`);

        // 3. Transform Data
        debugLog.push("Transformando datos...");
        const proveedoresToInsert = fProData.map((item: any) => {
            // Parse Factusol row structure: array of {columna, dato}
            const getVal = (colName: string) => {
                const cell = item.find((c: any) => c.columna === colName);
                return cell ? cell.dato : null;
            };

            const codPro = getVal('CODPRO');
            const nombreComercial = getVal('NOCPRO');
            const nombreFiscal = getVal('NOFPRO');
            const nombre = nombreComercial || nombreFiscal || 'Sin Nombre';

            // Construct IBAN
            const ent = getVal('ENTPRO') || '';
            const ofi = getVal('OFIPRO') || '';
            const dco = getVal('DCOPRO') || '';
            const cue = getVal('CUEPRO') || '';
            const iban = (ent && ofi && dco && cue) ? `${ent}${ofi}${dco}${cue}` : '';

            return {
                id_erp: codPro,
                nombre_comercial: nombreComercial || nombre,
                nombre_fiscal: nombreFiscal,
                cif: getVal('NIFPRO'),
                direccion_facturacion: getVal('DOMPRO'),
                ciudad: getVal('POBPRO'),
                codigo_postal: getVal('CPOPRO'),
                provincia: getVal('PROPRO'),
                pais: 'España', // Default
                telefono_contacto: getVal('TELPRO'),
                email_contacto: getVal('EMAPRO'),
                contacto: getVal('PCOPRO'), // Now mapped to PCOPRO (Person name)
                forma_de_pago_habitual: getVal('FPAPRO'),
                iban: iban,
            };
        });

        // 4. Transaction: Delete All and Insert
        debugLog.push("Iniciando transacción en Supabase...");

        // Delete all existing records
        const { error: deleteError } = await supabase
            .from('proveedores')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (safe delete)

        if (deleteError) {
            throw new Error(`Error borrando datos antiguos: ${deleteError.message}`);
        }
        debugLog.push("Datos antiguos borrados.");

        // Insert new data in chunks
        const chunkSize = 100;
        for (let i = 0; i < proveedoresToInsert.length; i += chunkSize) {
            const chunk = proveedoresToInsert.slice(i, i + chunkSize);
            const { error: insertError } = await supabase
                .from('proveedores')
                .insert(chunk);

            if (insertError) {
                throw new Error(`Error insertando bloque ${i}: ${insertError.message}`);
            }
        }
        debugLog.push("Todos los datos insertados correctamente.");

        return NextResponse.json({
            success: true,
            count: proveedoresToInsert.length,
            debugLog
        });

    } catch (error) {
        console.error("Sync Error:", error);
        debugLog.push(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            debugLog
        }, { status: 500 });
    }
}
