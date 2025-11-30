/**
 * Migration Utility: LocalStorage → Supabase
 * 
 * This script helps migrate existing localStorage data to Supabase.
 * Run this once per user/browser to transfer their data.
 * 
 * Usage:
 * 1. Import this in a page component
 * 2. Call migrateAllData() when user clicks a "Migrate Data" button
 * 3. Show progress/success messages to user
 */

import { supabase } from '@/lib/supabase';

export type MigrationResult = {
    entity: string;
    success: boolean;
    itemsProcessed: number;
    error?: string;
};

export type MigrationProgress = {
    total: number;
    completed: number;
    current: string;
    results: MigrationResult[];
};

/**
 * Migrate recetas from localStorage to Supabase
 */
async function migrateRecetas(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('recetas');
        if (!stored) {
            return { entity: 'recetas', success: true, itemsProcessed: 0 };
        }

        const recetas = JSON.parse(stored);
        if (!Array.isArray(recetas) || recetas.length === 0) {
            return { entity: 'recetas', success: true, itemsProcessed: 0 };
        }

        // Insert recetas
        const recetasToInsert = recetas.map(r => ({
            id: r.id,
            nombre: r.nombre,
            descripcion_comercial: r.descripcionComercial,
            precio_venta: r.precioVenta || 0,
            coste_teorico: r.costeTeorico || 0,
            estado: r.estado || 'BORRADOR',
        }));

        const { error: recetasError } = await supabase
            .from('recetas')
            .upsert(recetasToInsert, { onConflict: 'id' });

        if (recetasError) throw recetasError;

        // Insert receta_detalles
        const detalles: any[] = [];
        recetas.forEach(r => {
            (r.elaboraciones || []).forEach((elab: any) => {
                detalles.push({
                    receta_id: r.id,
                    tipo: 'ELABORACION',
                    item_id: elab.elaboracionId,
                    cantidad: elab.cantidad,
                });
            });
        });

        if (detalles.length > 0) {
            const { error: detallesError } = await supabase
                .from('receta_detalles')
                .upsert(detalles);

            if (detallesError) throw detallesError;
        }

        return { entity: 'recetas', success: true, itemsProcessed: recetas.length };
    } catch (error: any) {
        return { entity: 'recetas', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate elaboraciones from localStorage to Supabase
 */
async function migrateElaboraciones(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('elaboraciones');
        if (!stored) {
            return { entity: 'elaboraciones', success: true, itemsProcessed: 0 };
        }

        const elaboraciones = JSON.parse(stored);
        if (!Array.isArray(elaboraciones) || elaboraciones.length === 0) {
            return { entity: 'elaboraciones', success: true, itemsProcessed: 0 };
        }

        // Insert elaboraciones
        const elaboracionesToInsert = elaboraciones.map(e => ({
            id: e.id,
            nombre: e.nombre,
            partida: e.partidaProduccion,
            unidad_produccion: e.unidadProduccion,
            instrucciones: e.instruccionesPreparacion,
            caducidad_dias: e.caducidadDias || 3,
            coste_unitario: e.costeUnitario || 0,
        }));

        const { error: elabError } = await supabase
            .from('elaboraciones')
            .upsert(elaboracionesToInsert, { onConflict: 'id' });

        if (elabError) throw elabError;

        // Insert componentes
        const componentes: any[] = [];
        elaboraciones.forEach(e => {
            (e.componentes || []).forEach((comp: any) => {
                componentes.push({
                    elaboracion_padre_id: e.id,
                    tipo_componente: comp.tipo === 'ingrediente' ? 'ARTICULO' : 'ELABORACION',
                    componente_id: comp.componenteId,
                    cantidad_neta: comp.cantidad,
                    merma_aplicada: comp.merma || 0,
                });
            });
        });

        if (componentes.length > 0) {
            const { error: compError } = await supabase
                .from('elaboracion_componentes')
                .upsert(componentes);

            if (compError) throw compError;
        }

        return { entity: 'elaboraciones', success: true, itemsProcessed: elaboraciones.length };
    } catch (error: any) {
        return { entity: 'elaboraciones', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate eventos (serviceOrders) from localStorage to Supabase
 */
async function migrateEventos(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('serviceOrders');
        if (!stored) {
            return { entity: 'eventos', success: true, itemsProcessed: 0 };
        }

        const serviceOrders = JSON.parse(stored);
        if (!Array.isArray(serviceOrders) || serviceOrders.length === 0) {
            return { entity: 'eventos', success: true, itemsProcessed: 0 };
        }

        const eventosToInsert = serviceOrders
            .filter(so => so.vertical !== 'Entregas')
            .map(so => ({
                id: so.id,
                numero_expediente: so.serviceNumber,
                nombre_evento: so.client,
                fecha_inicio: so.startDate,
                fecha_fin: so.endDate,
                estado: so.status === 'Confirmado' ? 'CONFIRMADO' : 'BORRADOR',
                comensales: so.asistentes || 0,
            }));

        if (eventosToInsert.length > 0) {
            const { error } = await supabase
                .from('eventos')
                .upsert(eventosToInsert, { onConflict: 'id' });

            if (error) throw error;
        }

        return { entity: 'eventos', success: true, itemsProcessed: eventosToInsert.length };
    } catch (error: any) {
        return { entity: 'eventos', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate entregas from localStorage to Supabase
 */
async function migrateEntregas(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('entregas');
        if (!stored) {
            return { entity: 'entregas', success: true, itemsProcessed: 0 };
        }

        const entregas = JSON.parse(stored);
        if (!Array.isArray(entregas) || entregas.length === 0) {
            return { entity: 'entregas', success: true, itemsProcessed: 0 };
        }

        const entregasToInsert = entregas.map(e => ({
            id: e.id,
            numero_expediente: e.serviceNumber || e.numero_expediente,
            nombre_evento: e.eventName || e.nombre_evento,
            fecha_inicio: e.startDate || e.fecha_inicio,
            fecha_fin: e.endDate || e.fecha_fin,
            estado: e.status === 'Confirmado' ? 'CONFIRMADO' : 'BORRADOR',
            vertical: 'Entregas',
            facturacion: e.facturacion || 0,
            comisiones_agencia: e.comisionesAgencia || 0,
            comisiones_canon: e.comisionesCanon || 0,
            tarifa: e.tarifa,
        }));

        const { error } = await supabase
            .from('entregas')
            .upsert(entregasToInsert, { onConflict: 'id' });

        if (error) throw error;

        return { entity: 'entregas', success: true, itemsProcessed: entregas.length };
    } catch (error: any) {
        return { entity: 'entregas', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate transporteOrders from localStorage to Supabase
 */
async function migrateTransporte(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('transporteOrders');
        if (!stored) {
            return { entity: 'transporte', success: true, itemsProcessed: 0 };
        }

        const orders = JSON.parse(stored);
        if (!Array.isArray(orders) || orders.length === 0) {
            return { entity: 'transporte', success: true, itemsProcessed: 0 };
        }

        const toInsert = orders.map(o => ({
            id: o.id,
            evento_id: o.osId,
            tipo_transporte: o.tipoTransporte,
            proveedor_id: o.proveedorId,
            fecha_servicio: o.fecha,
            precio: o.precio || 0,
            observaciones: o.observaciones,
            data: {
                lugarRecogida: o.lugarRecogida,
                horaRecogida: o.horaRecogida,
                lugarEntrega: o.lugarEntrega,
                horaEntrega: o.horaEntrega,
                status: o.status,
                firmaUrl: o.firmaUrl,
                firmadoPor: o.firmadoPor,
                dniReceptor: o.dniReceptor,
                fechaFirma: o.fechaFirma,
                hitosIds: o.hitosIds
            }
        }));

        const { error } = await supabase
            .from('pedidos_transporte')
            .upsert(toInsert, { onConflict: 'id' });

        if (error) throw error;

        return { entity: 'transporte', success: true, itemsProcessed: orders.length };
    } catch (error: any) {
        return { entity: 'transporte', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate decoracionOrders from localStorage to Supabase
 */
async function migrateDecoracion(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('decoracionOrders');
        if (!stored) {
            return { entity: 'decoracion', success: true, itemsProcessed: 0 };
        }

        const orders = JSON.parse(stored);
        if (!Array.isArray(orders) || orders.length === 0) {
            return { entity: 'decoracion', success: true, itemsProcessed: 0 };
        }

        const toInsert = orders.map(o => ({
            id: o.id,
            evento_id: o.osId,
            concepto: o.concepto,
            precio: o.precio || 0,
            descripcion: o.observaciones,
            data: {
                fecha: o.fecha
            }
        }));

        const { error } = await supabase
            .from('pedidos_decoracion')
            .upsert(toInsert, { onConflict: 'id' });

        if (error) throw error;

        return { entity: 'decoracion', success: true, itemsProcessed: orders.length };
    } catch (error: any) {
        return { entity: 'decoracion', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate atipicoOrders from localStorage to Supabase
 */
async function migrateAtipicos(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('atipicoOrders');
        if (!stored) {
            return { entity: 'atipicos', success: true, itemsProcessed: 0 };
        }

        const orders = JSON.parse(stored);
        if (!Array.isArray(orders) || orders.length === 0) {
            return { entity: 'atipicos', success: true, itemsProcessed: 0 };
        }

        const toInsert = orders.map(o => ({
            id: o.id,
            evento_id: o.osId,
            concepto: o.concepto,
            precio: o.precio || 0,
            descripcion: o.observaciones,
            data: {
                fecha: o.fecha,
                status: o.status
            }
        }));

        const { error } = await supabase
            .from('pedidos_atipicos')
            .upsert(toInsert, { onConflict: 'id' });

        if (error) throw error;

        return { entity: 'atipicos', success: true, itemsProcessed: orders.length };
    } catch (error: any) {
        return { entity: 'atipicos', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate personalMiceOrders from localStorage to Supabase
 */
async function migratePersonalMice(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('personalMiceOrders');
        if (!stored) {
            return { entity: 'personalMice', success: true, itemsProcessed: 0 };
        }

        const orders = JSON.parse(stored);
        if (!Array.isArray(orders) || orders.length === 0) {
            return { entity: 'personalMice', success: true, itemsProcessed: 0 };
        }

        const toInsert: any[] = [];
        orders.forEach((o: any) => {
            if (o.items && Array.isArray(o.items)) {
                o.items.forEach((item: any) => {
                    toInsert.push({
                        evento_id: o.osId,
                        personal_id: item.id, // Assuming item.id is the personal ID (DNI or UUID)
                        categoria: item.categoria,
                        hora_entrada: item.horaEntrada,
                        hora_salida: item.horaSalida,
                        hora_entrada_real: item.horaEntradaReal,
                        hora_salida_real: item.horaSalidaReal,
                        precio_hora: item.precioHora || 0,
                        observaciones: item.observaciones,
                        data: {
                            status: item.status,
                            horasEstimadas: item.horasEstimadas,
                            horasReales: item.horasReales,
                            costeEstimado: item.costeEstimado,
                            costeReal: item.costeReal
                        }
                    });
                });
            }
        });

        if (toInsert.length > 0) {
            const { error } = await supabase
                .from('personal_mice_asignaciones')
                .upsert(toInsert); // No ID conflict check as we are creating new rows

            if (error) throw error;
        }

        return { entity: 'personalMice', success: true, itemsProcessed: orders.length };
    } catch (error: any) {
        return { entity: 'personalMice', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate personalExterno from localStorage to Supabase
 */
async function migratePersonalExterno(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('personalExterno');
        if (!stored) {
            return { entity: 'personalExterno', success: true, itemsProcessed: 0 };
        }

        const orders = JSON.parse(stored);
        if (!Array.isArray(orders) || orders.length === 0) {
            return { entity: 'personalExterno', success: true, itemsProcessed: 0 };
        }

        const toInsert = orders.map(o => ({
            evento_id: o.osId,
            turnos: o.turnos || [],
            data: {
                status: o.status,
                observacionesGenerales: o.observacionesGenerales,
                hojaFirmadaUrl: o.hojaFirmadaUrl
            }
        }));

        const { error } = await supabase
            .from('personal_externo_eventos')
            .upsert(toInsert);

        if (error) throw error;

        return { entity: 'personalExterno', success: true, itemsProcessed: orders.length };
    } catch (error: any) {
        return { entity: 'personalExterno', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate personalExternoAjustes from localStorage to Supabase
 */
async function migratePersonalExternoAjustes(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('personalExternoAjustes');
        if (!stored) {
            return { entity: 'personalExternoAjustes', success: true, itemsProcessed: 0 };
        }

        const ajustesMap = JSON.parse(stored); // Record<string, Ajuste[]>
        const toInsert: any[] = [];

        Object.entries(ajustesMap).forEach(([osId, ajustes]: [string, any]) => {
            if (Array.isArray(ajustes)) {
                ajustes.forEach(a => {
                    toInsert.push({
                        id: a.id,
                        evento_id: osId,
                        concepto: a.concepto,
                        importe: a.importe,
                        data: {
                            proveedorId: a.proveedorId
                        }
                    });
                });
            }
        });

        if (toInsert.length > 0) {
            const { error } = await supabase
                .from('personal_externo_ajustes')
                .upsert(toInsert, { onConflict: 'id' });

            if (error) throw error;
        }

        return { entity: 'personalExternoAjustes', success: true, itemsProcessed: toInsert.length };
    } catch (error: any) {
        return { entity: 'personalExternoAjustes', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate personalEntrega from localStorage to Supabase
 */
async function migratePersonalEntrega(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('personalEntrega');
        if (!stored) {
            return { entity: 'personalEntrega', success: true, itemsProcessed: 0 };
        }

        const orders = JSON.parse(stored);
        if (!Array.isArray(orders) || orders.length === 0) {
            return { entity: 'personalEntrega', success: true, itemsProcessed: 0 };
        }

        const toInsert = orders.map(o => ({
            entrega_id: o.osId, // Assuming osId maps to entrega_id
            turnos: o.turnos || [],
            data: {
                status: o.status,
                observacionesGenerales: o.observacionesGenerales
            }
        }));

        const { error } = await supabase
            .from('personal_entrega')
            .upsert(toInsert);

        if (error) throw error;

        return { entity: 'personalEntrega', success: true, itemsProcessed: orders.length };
    } catch (error: any) {
        return { entity: 'personalEntrega', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate ordenesFabricacion from localStorage to Supabase
 */
async function migrateOrdenesFabricacion(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('ordenesFabricacion');
        if (!stored) {
            return { entity: 'ordenesFabricacion', success: true, itemsProcessed: 0 };
        }

        const orders = JSON.parse(stored);
        if (!Array.isArray(orders) || orders.length === 0) {
            return { entity: 'ordenesFabricacion', success: true, itemsProcessed: 0 };
        }

        const toInsert = orders.map(o => ({
            id: o.id,
            evento_id: o.osIDs && o.osIDs.length > 0 ? o.osIDs[0] : null,
            items: [], // OrdenFabricacion does not have items in the same way
            estado: o.estado || 'Pendiente',
            data: o // Store full object to preserve all fields
        }));

        const { error } = await supabase
            .from('ordenes_fabricacion')
            .upsert(toInsert, { onConflict: 'id' });

        if (error) throw error;

        return { entity: 'ordenesFabricacion', success: true, itemsProcessed: orders.length };
    } catch (error: any) {
        return { entity: 'ordenesFabricacion', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate pickingSheets from localStorage to Supabase
 */
async function migratePickingSheets(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('pickingSheets');
        if (!stored) {
            return { entity: 'pickingSheets', success: true, itemsProcessed: 0 };
        }

        const sheetsMap = JSON.parse(stored); // Record<string, PickingSheet>
        const toInsert: any[] = [];

        Object.values(sheetsMap).forEach((sheet: any) => {
            toInsert.push({
                evento_id: sheet.osId,
                items: sheet.items || [],
                estado: sheet.status || 'Pendiente',
                data: {
                    fecha: sheet.fecha,
                    observaciones: sheet.observaciones
                }
            });
        });

        if (toInsert.length > 0) {
            const { error } = await supabase
                .from('hojas_picking')
                .upsert(toInsert); // No ID in source, creating new rows

            if (error) throw error;
        }

        return { entity: 'pickingSheets', success: true, itemsProcessed: toInsert.length };
    } catch (error: any) {
        return { entity: 'pickingSheets', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Migrate returnSheets from localStorage to Supabase
 */
async function migrateReturnSheets(): Promise<MigrationResult> {
    try {
        const stored = localStorage.getItem('returnSheets');
        if (!stored) {
            return { entity: 'returnSheets', success: true, itemsProcessed: 0 };
        }

        const sheetsMap = JSON.parse(stored); // Record<string, ReturnSheet>
        const toInsert: any[] = [];

        Object.values(sheetsMap).forEach((sheet: any) => {
            toInsert.push({
                evento_id: sheet.osId,
                // items? ReturnSheet might have different structure
                data: {
                    items: sheet.items, // Storing items in data if no specific column
                    status: sheet.status,
                    fecha: sheet.fecha,
                    observaciones: sheet.observaciones
                }
            });
        });

        if (toInsert.length > 0) {
            const { error } = await supabase
                .from('hojas_retorno')
                .upsert(toInsert);

            if (error) throw error;
        }

        return { entity: 'returnSheets', success: true, itemsProcessed: toInsert.length };
    } catch (error: any) {
        return { entity: 'returnSheets', success: false, itemsProcessed: 0, error: error.message };
    }
}

/**
 * Clear migrated data from localStorage
 */
function clearMigratedData(entities: string[]) {
    entities.forEach(entity => {
        if (localStorage.getItem(entity)) {
            // Backup to a different key before removing
            const data = localStorage.getItem(entity);
            localStorage.setItem(`${entity}_backup_${Date.now()}`, data!);
            localStorage.removeItem(entity);
        }
    });
}

/**
 * Main migration function
 * Migrates all critical data from localStorage to Supabase
 */
export async function migrateAllData(
    onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationProgress> {
    const migrations = [
        { name: 'recetas', fn: migrateRecetas },
        { name: 'elaboraciones', fn: migrateElaboraciones },
        { name: 'eventos', fn: migrateEventos },
        { name: 'entregas', fn: migrateEntregas },
        { name: 'transporte', fn: migrateTransporte },
        { name: 'decoracion', fn: migrateDecoracion },
        { name: 'atipicos', fn: migrateAtipicos },
        { name: 'personalMice', fn: migratePersonalMice },
        { name: 'personalExterno', fn: migratePersonalExterno },
        { name: 'personalExternoAjustes', fn: migratePersonalExternoAjustes },
        { name: 'personalEntrega', fn: migratePersonalEntrega },
        { name: 'ordenesFabricacion', fn: migrateOrdenesFabricacion },
        { name: 'pickingSheets', fn: migratePickingSheets },
        { name: 'returnSheets', fn: migrateReturnSheets },
    ];

    const results: MigrationResult[] = [];
    let completed = 0;

    for (const migration of migrations) {
        if (onProgress) {
            onProgress({
                total: migrations.length,
                completed,
                current: migration.name,
                results: [...results],
            });
        }

        const result = await migration.fn();
        results.push(result);
        completed++;
    }

    // Clear migrated data from localStorage
    const successfulMigrations = results
        .filter(r => r.success && r.itemsProcessed > 0)
        .map(r => r.entity);

    if (successfulMigrations.length > 0) {
        clearMigratedData(successfulMigrations);
    }

    const finalProgress: MigrationProgress = {
        total: migrations.length,
        completed,
        current: 'Completado',
        results,
    };

    if (onProgress) {
        onProgress(finalProgress);
    }

    return finalProgress;
}

/**
 * Check if migration is needed
 * Returns true if there's data in localStorage that hasn't been migrated
 */
export function isMigrationNeeded(): boolean {
    const criticalKeys = ['recetas', 'elaboraciones', 'serviceOrders', 'entregas'];

    return criticalKeys.some(key => {
        const data = localStorage.getItem(key);
        if (!data) return false;

        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) && parsed.length > 0;
        } catch {
            return false;
        }
    });
}

/**
 * Get migration summary
 * Returns info about what data exists in localStorage
 */
export function getMigrationSummary(): Record<string, number> {
    const keys = ['recetas', 'elaboraciones', 'serviceOrders', 'entregas'];
    const summary: Record<string, number> = {};

    keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                summary[key] = Array.isArray(parsed) ? parsed.length : 0;
            } catch {
                summary[key] = 0;
            }
        } else {
            summary[key] = 0;
        }
    });

    return summary;
}
