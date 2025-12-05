// Quick script to check elaboration usage in Supabase
import { supabase } from './lib/supabase';

async function checkElaborationUsage() {
    console.log('Checking elaboration usage in Supabase...\n');

    // Get all elaboraciones
    const { data: elaboraciones, error: elabError } = await supabase
        .from('elaboraciones')
        .select('id, nombre');

    if (elabError) {
        console.error('Error fetching elaboraciones:', elabError);
        return;
    }

    console.log(`Found ${elaboraciones?.length} elaboraciones\n`);

    // For each elaboracion, check usage in receta_detalles
    for (const elab of elaboraciones || []) {
        const { data: usageData, error: usageError } = await supabase
            .from('receta_detalles')
            .select('receta_id')
            .eq('tipo', 'ELABORACION')
            .eq('item_id', elab.id);

        if (usageError) {
            console.error(`Error checking usage for ${elab.nombre}:`, usageError);
            continue;
        }

        if (usageData && usageData.length > 0) {
            console.log(`${elab.nombre} (${elab.id}): Used in ${usageData.length} recipes`);

            // Get recipe names
            const recetaIds = usageData.map((u: any) => u.receta_id);
            const { data: recetas } = await supabase
                .from('recetas')
                .select('id, nombre')
                .in('id', recetaIds);

            if (recetas) {
                recetas.forEach((r: any) => {
                    console.log(`  - ${r.nombre} (${r.id})`);
                });
            }
        } else {
            console.log(`${elab.nombre} (${elab.id}): Not used in any recipes`);
        }
    }
}

checkElaborationUsage();
