const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    const tables = ['pedidos_entrega', 'pedido_entrega', 'entregas_pedidos', 'entrega_pedidos', 'os_pedidos_entrega'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('*').limit(0);
        if (!error) {
            console.log('Table found: ' + t);
            // Try to get columns
            const { data, error: err2 } = await supabase.from(t).select('*').limit(1);
            if (data && data.length > 0) {
                console.log('Columns for ' + t + ': ' + Object.keys(data[0]).join(', '));
            } else {
                console.log('Table ' + t + ' is empty, trying to trigger error for columns...');
                const { error: err3 } = await supabase.from(t).insert({ non_existent_column: 1 });
                console.log('Error for ' + t + ': ' + err3.message);
            }
        } else {
            console.log('Table ' + t + ' error: ' + error.message);
        }
    }
}

run();
