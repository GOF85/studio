'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Alergeno } from '@/types';
import { Gluten, Fish, Milk, Egg, Shell, Peanut, Soy, Nut, Celery, Mustard, Sesame, Sulfite, Lupin, Mollusc } from './allergen-svgr';

const allergenMap: Record<Alergeno, { icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string }> = {
    GLUTEN: { icon: Gluten, label: 'Gluten' },
    CRUSTACEOS: { icon: Shell, label: 'Crustáceos' },
    HUEVOS: { icon: Egg, label: 'Huevos' },
    PESCADO: { icon: Fish, label: 'Pescado' },
    CACAHUETES: { icon: Peanut, label: 'Cacahuetes' },
    SOJA: { icon: Soy, label: 'Soja' },
    LACTEOS: { icon: Milk, label: 'Lácteos' },
    FRUTOS_DE_CASCARA: { icon: Nut, label: 'Frutos de cáscara' },
    APIO: { icon: Celery, label: 'Apio' },
    MOSTAZA: { icon: Mustard, label: 'Mostaza' },
    SESAMO: { icon: Sesame, label: 'Sésamo' },
    SULFITOS: { icon: Sulfite, label: 'Sulfitos' },
    ALTRAMUCES: { icon: Lupin, label: 'Altramuces' },
    MOLUSCOS: { icon: Mollusc, label: 'Moluscos' },
};

export const AllergenIcon = ({ allergen }: { allergen: Alergeno }) => {
    const IconComponent = allergenMap[allergen]?.icon;
    const label = allergenMap[allergen]?.label || allergen;

    if (!IconComponent) return null;

    return (
        <Tooltip>
            <TooltipTrigger>
                <div className="w-6 h-6 flex items-center justify-center">
                    <IconComponent className="w-full h-full" />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
    );
};
