

'use client';

import { useRouter } from 'next/navigation';
import IngredienteFormPage from '../[id]/page';

export default function NuevoIngredientePage() {
    const router = useRouter();

    // Reutilizamos el componente del formulario de edición, 
    // ya que la lógica es casi idéntica y se maneja por la ausencia de un `id` en la URL.
    // La página [id] ya contempla el caso de "nuevo".
    
    return <IngredienteFormPage />;
}
