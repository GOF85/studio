
'use client';

import { ALERGENOS_INFO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Alergeno } from "@/types";
import { Badge } from "../ui/badge";

export const AllergenBadge = ({ allergen, isTraza = false }: { allergen: Alergeno, isTraza?: boolean }) => {
    const info = ALERGENOS_INFO[allergen];
    if (!info) return null;

    return (
        <Badge
            className={cn(
                "text-white text-xs font-bold w-10 h-5 flex items-center justify-center",
                info.color,
                isTraza && "opacity-60"
            )}
        >
            {info.abbr}
        </Badge>
    );
};
