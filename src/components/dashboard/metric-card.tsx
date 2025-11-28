'use client';

import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMetricCardProps {
    icon: LucideIcon;
    label: string;
    value: number | string;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function DashboardMetricCard({
    icon: Icon,
    label,
    value,
    trend,
    className
}: DashboardMetricCardProps) {
    return (
        <Card className={cn("p-4 hover:shadow-md transition-shadow", className)}>
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold leading-none mb-1">{value}</p>
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
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
