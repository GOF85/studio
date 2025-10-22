'use client';

import ElaboracionFormPage from '../[id]/page';

export default function NuevaElaboracionPage() {
    // Reutilizamos el componente del formulario de edición,
    // que ya maneja el caso de 'nuevo' o 'clone'.
    return <ElaboracionFormPage />;
}
