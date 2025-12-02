'use client';

import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMetricCardProps {
    icon: LucideIcon;
    label: string;
    value: number | string;
    secondaryValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
    compact?: boolean;
}

export function DashboardMetricCard({
    icon: Icon,
    label,
    value,
    secondaryValue,
    trend,
    className,
    compact = false
}: DashboardMetricCardProps) {
    return (
        <Card className={cn(
            "hover:shadow-md transition-shadow transition-all duration-200",
            compact ? "p-3" : "p-4",
            className
        )}>
            <div className="flex items-center gap-3">
                <div className={cn(
                    "rounded-lg bg-primary/10 flex items-center justify-center shrink-0",
                    compact ? "p-1.5 w-8 h-8" : "p-2 w-10 h-10"
                )}>
                    <Icon className={cn(
                        "text-primary",
                        compact ? "w-4 h-4" : "w-5 h-5"
                    )} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-baseline gap-2">
                        <p className={cn(
                            "font-bold leading-none",
                            compact ? "text-lg" : "text-2xl"
                        )}>{value}</p>
                        {secondaryValue && (
                            <span className="text-xs font-medium text-muted-foreground">
                                {secondaryValue}
                            </span>
                        )}
                    </div>
                    <p className={cn(
                        "text-muted-foreground truncate",
                        compact ? "text-[10px] uppercase tracking-wider font-medium" : "text-xs"
                    )}>{label}</p>
                </div>
                {trend && (
                    <div className={cn(
                        "text-xs font-medium",
                        trend === 'up' && "text-green-600",
                        trend === 'down' && "text-red-600",
                        trend === 'neutral' && "text-muted-foreground"
                    )}>
                        {trend === 'up' && '↑'}
                        {trend === 'down' && '↓'}
                        {trend === 'neutral' && '•'}
                    </div>
                )}
            </div>
        </Card>
    );
}
