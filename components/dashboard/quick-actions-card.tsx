'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface QuickAction {
    id: string;
    title: string;
    type: 'recent' | 'pending' | 'alert';
    timestamp: string;
    href: string;
}

const mockActions: QuickAction[] = [
    {
        id: '1',
        title: 'Servicio MICE - Evento Corporativo',
        type: 'recent',
        timestamp: 'hace 2 horas',
        href: '/pes'
    },
    {
        id: '2',
        title: 'Revisión ingredientes pendiente',
        type: 'pending',
        timestamp: 'pendiente',
        href: '/book/ingredientes'
    },
    {
        id: '3',
        title: 'Sincronización artículos ERP',
        type: 'alert',
        timestamp: 'hace 5 min',
        href: '/bd/erp'
    }
];

export function QuickActionsCard() {
    const getIcon = (type: QuickAction['type']) => {
        switch (type) {
            case 'recent': return Clock;
            case 'pending': return AlertCircle;
            case 'alert': return CheckCircle2;
        }
    };

    const getBadgeVariant = (type: QuickAction['type']) => {
        switch (type) {
            case 'recent': return 'secondary' as const;
            case 'pending': return 'destructive' as const;
            case 'alert': return 'default' as const;
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {mockActions.map((action) => {
                        const Icon = getIcon(action.type);
                        return (
                            <Link
                                key={action.id}
                                href={action.href}
                                className="block p-3 rounded-md hover:bg-accent transition-colors group"
                            >
                                <div className="flex items-start gap-3">
                                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                            {action.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {action.timestamp}
                                        </p>
                                    </div>
                                    <Badge variant={getBadgeVariant(action.type)} className="text-xs shrink-0">
                                        {action.type === 'recent' && 'Reciente'}
                                        {action.type === 'pending' && 'Pendiente'}
                                        {action.type === 'alert' && 'Nuevo'}
                                    </Badge>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
