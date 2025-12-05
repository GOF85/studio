'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <Card className={className}>
            <CardHeader className={cn(
                "flex flex-row items-center justify-between space-y-0 pb-2",
                compact ? 'p-3' : ''
            )}>
                <CardTitle className={cn(
                    "font-medium",
                    compact ? 'text-xs' : 'text-sm'
                )}>
                    {label}
                </CardTitle>
                <Icon className={cn(
                    "text-muted-foreground",
                    compact ? 'h-3 w-3' : 'h-4 w-4'
                )} />
            </CardHeader>
            <CardContent className={compact ? 'p-3 pt-0' : ''}>
                <div className={cn(
                    "font-bold",
                    compact ? 'text-lg' : 'text-2xl'
                )}>{value}</div>
                {secondaryValue && (
                    <div className="flex items-center gap-2 mt-1">
                        <p className={cn(
                            "text-muted-foreground",
                            compact ? "text-[10px]" : "text-xs"
                        )}>
                            {secondaryValue}
                        </p>
                        {trend && (
                            <span className={cn(
                                "text-xs font-medium",
                                trend === 'up' && "text-green-600",
                                trend === 'down' && "text-red-600",
                                trend === 'neutral' && "text-muted-foreground"
                            )}>
                                {trend === 'up' && '↑'}
                                {trend === 'down' && '↓'}
                                {trend === 'neutral' && '•'}
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
