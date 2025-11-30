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
