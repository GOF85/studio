
'use client';

import { ALERGENOS_INFO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Alergeno } from "@/types";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const AllergenBadge = ({ allergen, isTraza = false, className }: { allergen: Alergeno, isTraza?: boolean, className?: string }) => {
    const info = ALERGENOS_INFO[allergen];
    if (!info) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <Badge
                        className={cn(
                            "text-white text-xs font-bold w-10 h-5 flex items-center justify-center cursor-default",
                            info.color,
                            isTraza && "opacity-60",
                            className
                        )}
                        style={{ backgroundColor: info.color.startsWith('bg-') ? undefined : info.color }}
                    >
                        {info.abbr}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{allergen.charAt(0) + allergen.slice(1).toLowerCase().replace('_', ' ')} {isTraza && '(trazas)'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
