
'use client';

import IngredienteFormPage from '../[id]/page';

export default function NuevoIngredientePage() {
    // Reutilizamos el componente del formulario de edición,
    // que ya maneja el caso de 'nuevo' o 'clone'.
    return <IngredienteFormPage />;
}
