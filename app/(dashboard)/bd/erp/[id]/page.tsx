'use client';

import { useParams } from 'next/navigation';
import { usePrecioHistory } from '@/hooks/use-precio-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ArticuloERPHistoricoPage() {
    const params = useParams();
    const articuloId = params.id as string;
    const { data: history, isLoading } = usePrecioHistory(articuloId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Cargando historial...</p>
                </div>
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <div className="space-y-4">
                <Link href="/bd/erp">
                    <Button variant="ghost">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Artículos ERP
                    </Button>
                </Link>
                <Card>
                    <CardContent className="py-12">
                        <p className="text-center text-muted-foreground">
                            No hay historial de precios para este artículo
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Calculate statistics
    const prices = history.map(h => h.precioCalculado);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const firstPrice = history[history.length - 1].precioCalculado;
    const lastPrice = history[0].precioCalculado;
    const totalChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    // Prepare chart data (reverse for chronological order)
    const chartData = [...history].reverse().map(h => ({
        fecha: format(parseISO(h.fecha), 'dd/MM/yy'),
        precio: h.precioCalculado,
    }));

    const handleExport = () => {
        const csv = [
            ['Fecha', 'Precio', 'Proveedor ID'],
            ...history.map(h => [
                format(parseISO(h.fecha), 'dd/MM/yyyy'),
                h.precioCalculado.toString(),
                h.proveedorId || '',
            ]),
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `precio_history_${articuloId}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/bd/erp">
                        <Button variant="ghost" className="mb-2">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Artículos ERP
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold">Histórico de Precios</h1>
                    <p className="text-muted-foreground mt-1">Artículo: {articuloId}</p>
                </div>
                <Button onClick={handleExport} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                </Button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Precio Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(lastPrice)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Cambio Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-2xl font-bold ${totalChange > 0 ? 'text-red-500' : totalChange < 0 ? 'text-green-500' : ''}`}>
                            {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Precio Mínimo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(minPrice)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Precio Máximo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(maxPrice)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Evolución del Precio</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="fecha" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            <Line type="monotone" dataKey="precio" stroke="#8884d8" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial Completo ({history.length} registros)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Precio</TableHead>
                                <TableHead className="text-right">Cambio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((h, idx) => {
                                const prevPrice = idx < history.length - 1 ? history[idx + 1].precioCalculado : h.precioCalculado;
                                const change = prevPrice > 0 ? ((h.precioCalculado - prevPrice) / prevPrice) * 100 : 0;

                                return (
                                    <TableRow key={h.id}>
                                        <TableCell>
                                            {format(parseISO(h.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(h.precioCalculado)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {change !== 0 && (
                                                <span className={change > 0 ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
                                                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
