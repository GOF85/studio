'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { usePriceAlerts } from '@/hooks/use-price-notifications';
import { formatCurrency } from '@/lib/utils';

export function PriceAlertBanner() {
    const { data: alerts } = usePriceAlerts();

    if (!alerts || alerts.length === 0) return null;

    return (
        <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>⚠️ Alertas de Precio ({alerts.length})</AlertTitle>
            <AlertDescription>
                <ul className="mt-2 space-y-1">
                    {alerts.slice(0, 3).map((alert, i) => (
                        <li key={i}>
                            <strong>{alert.itemName}</strong>:
                            {formatCurrency(alert.oldPrice)} → {formatCurrency(alert.newPrice)}
                            <span className="text-red-600 font-semibold ml-1">
                                (+{alert.percentageChange.toFixed(1)}%)
                            </span>
                        </li>
                    ))}
                    {alerts.length > 3 && (
                        <li className="text-muted-foreground">
                            ... y {alerts.length - 3} más
                        </li>
                    )}
                </ul>
            </AlertDescription>
        </Alert>
    );
}
