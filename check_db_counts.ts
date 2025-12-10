import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Faltan variables de entorno');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n' + '='.repeat(80));
console.log('🔎 BÚSQUEDA EXHAUSTIVA DE TABLAS CON DATOS');
console.log('='.repeat(80) + '\n');

/**
 * Lista de posibles nombres de tablas para elaboraciones y recetas
 */
const TABLE_PATTERNS = {
    elaboraciones: [
        'elaboraciones',
        'elaboracion',
        'elaboraciones_v2',
        'elaboracion_v2',
        'book_elaboraciones',
        'book_elaboracion',
        'prep_elaboraciones',
        'platos',
        'dishes',
        'preparaciones',
        'formulas',
        'recetas_componentes',
    ],
    recetas: [
        'recetas',
        'receta',
        'recetas_v2',
        'receta_v2',
        'book_recetas',
        'book_receta',
        'recipes',
        'formulations',
        'menu_items',
        'platos_menu',
    ],
    other: [
        'book_detalles',
        'recipe_items',
        'recipe_details',
        'elaboration_items',
        'elaboration_details',
        'receta_items',
        'elaboracion_items',
    ]
};

async function searchTables() {
    const results: Record<string, any[]> = {};

    console.log('🔍 Buscando tablas de ELABORACIONES...\n');
    for (const tabla of TABLE_PATTERNS.elaboraciones) {
        try {
            const { count, error, data } = await supabase
                .from(tabla)
                // FIX: Añadido "as any" para evitar error de tipado en tabla dinámica
                .select('*', { count: 'exact', head: false } as any)
                .limit(1);

            if (!error && count !== null) {
                const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
                console.log(`✅ ${tabla.padEnd(25)} → ${count} registros`);
                if (columns.length > 0) {
                    console.log(`   Columnas: ${columns.join(', ')}\n`);
                }
                results[`elaboraciones_${tabla}`] = { count, columns };
            }
        } catch (e) {
            // Tabla no existe
        }
    }

    console.log('\n🔍 Buscando tablas de RECETAS...\n');
    for (const tabla of TABLE_PATTERNS.recetas) {
        try {
            const { count, error, data } = await supabase
                .from(tabla)
                // FIX: Añadido "as any"
                .select('*', { count: 'exact', head: false } as any)
                .limit(1);

            if (!error && count !== null) {
                const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
                console.log(`✅ ${tabla.padEnd(25)} → ${count} registros`);
                if (columns.length > 0) {
                    console.log(`   Columnas: ${columns.join(', ')}\n`);
                }
                results[`recetas_${tabla}`] = { count, columns };
            }
        } catch (e) {
            // Tabla no existe
        }
    }

    console.log('\n🔍 Buscando otras tablas relevantes...\n');
    for (const tabla of TABLE_PATTERNS.other) {
        try {
            const { count, error, data } = await supabase
                .from(tabla)
                // FIX: Añadido "as any"
                .select('*', { count: 'exact', head: false } as any)
                .limit(1);

            if (!error && count !== null) {
                const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
                console.log(`✅ ${tabla.padEnd(25)} → ${count} registros`);
                if (columns.length > 0) {
                    console.log(`   Columnas: ${columns.join(', ')}\n`);
                }
                results[`other_${tabla}`] = { count, columns };
            }
        } catch (e) {
            // Tabla no existe
        }
    }

    return results;
}

async function analyzeArticulosERP() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANÁLISIS DE ARTICULOS_ERP (6093 registros)');
    console.log('='.repeat(80) + '\n');

    try {
        const { data, error } = await supabase
            .from('articulos_erp')
            .select('*')
            .limit(1);

        if (!error && data) {
            console.log('Primeros 3 artículos:');
            data.slice(0, 3).forEach((art, i) => {
                console.log(`\n${i + 1}. ${art.nombre}`);
                console.log(`   ID: ${art.id}`);
                console.log(`   Tipo: ${art.tipo}`);
                console.log(`   Familia: ${art.familia_categoria}`);
                console.log(`   Precio: €${art.precio_compra}`);
            });

            console.log('\n\n📈 Distribución por TIPO:');
            const { data: types } = await supabase
                .from('articulos_erp')
                .select('tipo, count(*)', { count: 'exact' } as any) // FIX: También aquí por seguridad
                .order('tipo');

            types?.forEach((t: any) => {
                console.log(`   • ${t.tipo || 'Sin tipo'}: ${t.count} artículos`);
            });
        }
    } catch (e) {
        console.log('Error:', e);
    }
}

async function suggestNextSteps(results: Record<string, any>) {
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMENDACIONES');
    console.log('='.repeat(80) + '\n');

    const hasElaborations = Object.keys(results).some(k => k.startsWith('elaboraciones_') && results[k].count > 0);
    const hasRecetas = Object.keys(results).some(k => k.startsWith('recetas_') && results[k].count > 0);

    if (!hasElaborations && !hasRecetas) {
        console.log('❌ NO SE ENCONTRARON TABLAS CON DATOS\n');

        console.log('OPCIÓN 1: Usar solo INGREDIENTES + ARTICULOS_ERP');
        console.log('  └─ La página mostrará solo ingredientes con datos reales');
        console.log('  └─ Elaboraciones y recetas usarán datos DEMO\n');

        console.log('OPCIÓN 2: Crear las tablas manualmente en Supabase');
        console.log('  └─ Ir a: https://app.supabase.com/project/[TU_ID]/sql/new');
        console.log('  └─ Crear estructura base\n');

        console.log('OPCIÓN 3: Importar desde CSV o migración');
        console.log('  └─ Si tienes datos en otro formato, importarlos\n');
    } else {
        console.log('✅ ENCONTRADAS TABLAS CON DATOS\n');
        if (hasElaborations) {
            const tablaElab = Object.keys(results).find(k => k.startsWith('elaboraciones_') && results[k].count > 0);
            console.log(`📌 Tabla de ELABORACIONES: ${tablaElab?.split('_')[1]}`);
        }
        if (hasRecetas) {
            const tablaRec = Object.keys(results).find(k => k.startsWith('recetas_') && results[k].count > 0);
            console.log(`📌 Tabla de RECETAS: ${tablaRec?.split('_')[1]}`);
        }
        console.log('\n→ Actualizar use-escandallo-analytics.ts con los nombres encontrados\n');
    }
}

(async () => {
    try {
        const results = await searchTables();
        await analyzeArticulosERP();
        await suggestNextSteps(results);

        console.log('\n✅ Búsqueda completada\n');
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
})();