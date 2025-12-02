import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type KpiCardProps = {
    title: string;
    value: number | string;
    icon: LucideIcon;
    description?: string;
    className?: string;
}

export function KpiCard({ title, value, icon: Icon, description, className }: KpiCardProps) {
    const cardContent = (
        <Card className={cn("hover:shadow-lg transition-all", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
    
    if (!description) {
        return cardContent;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {cardContent}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
