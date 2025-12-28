'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDevoluciones, useMermas } from '@/hooks/use-os-logistics';
import { useMaterialOrders, useEvento } from '@/hooks/use-data-queries';
import { Package, RotateCcw, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OSDashboardSummaryProps {
    osId: string;
}

export function OSDashboardSummary({ osId }: OSDashboardSummaryProps) {
    const { data: serviceOrder } = useEvento(osId);
    const { data: materialOrders } = useMaterialOrders(serviceOrder?.id);
    const { loadDevoluciones } = useDevoluciones();
    const { loadMermas } = useMermas();

    const [devs, setDevs] = useState<any[]>([]);
    const [mermas, setMermas] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const [d, m] = await Promise.all([
                loadDevoluciones(osId),
                loadMermas(osId)
            ]);
            setDevs(d);
            setMermas(m);
        };
        if (osId) fetchData();
    }, [osId, loadDevoluciones, loadMermas]);

    const stats = useMemo(() => {
        if (!materialOrders) return null;

        const allItems = materialOrders.flatMap((o: any) => o.items);
        const totalItems = allItems.reduce((sum: number, i: any) => sum + i.quantity, 0);
        const totalDevueltos = devs.reduce((sum, d) => sum + d.cantidad, 0);
        const totalMermas = mermas.reduce((sum, m) => sum + m.cantidad, 0);
        const totalCosteMerma = mermas.reduce((sum, m) => sum + (m.coste_impacto || 0), 0);

        const pctDevuelto = totalItems > 0 ? (totalDevueltos / totalItems) * 100 : 0;
        const pctMerma = totalItems > 0 ? (totalMermas / totalItems) * 100 : 0;

        return {
            totalItems,
            totalDevueltos,
            totalMermas,
            totalCosteMerma,
            pctDevuelto,
            pctMerma,
            isComplete: totalDevueltos + totalMermas === totalItems && totalItems > 0
        };
    }, [materialOrders, devs, mermas]);

    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Material</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalItems} uds.</div>
                    <p className="text-xs text-muted-foreground">
                        Enviado en {materialOrders?.length || 0} pedidos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Retorno</CardTitle>
                    <RotateCcw className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.pctDevuelto.toFixed(1)}%</div>
                    <Progress value={stats.pctDevuelto} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                        {stats.totalDevueltos} de {stats.totalItems} devueltos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mermas</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.totalMermas} uds.</div>
                    <div className="flex items-center gap-2 mt-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-semibold">{formatCurrency(stats.totalCosteMerma)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Impacto económico total
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Estado Logístico</CardTitle>
                    {stats.isComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-2">
                        <Badge variant={stats.isComplete ? "success" : "warning"} className="w-fit">
                            {stats.isComplete ? "Cerrado / Completo" : "Pendiente de retorno"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                            {stats.totalItems - stats.totalDevueltos - stats.totalMermas} unidades pendientes
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
