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
        <Card className={cn("p-2", className)}>
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold leading-none">{value}</span>
                        {secondaryValue && (
                            <span className="text-[10px] text-muted-foreground">{secondaryValue}</span>
                        )}
                        {trend && (
                            <span className={cn(
                                "text-[10px] font-medium",
                                trend === 'up' && "text-green-600",
                                trend === 'down' && "text-red-600",
                                trend === 'neutral' && "text-muted-foreground"
                            )}>
                                {trend === 'up' && '↑'}
                                {trend === 'down' && '↓'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
