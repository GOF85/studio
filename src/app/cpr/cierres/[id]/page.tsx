
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Search } from 'lucide-react';
import type { CierreInventario } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatNumber, formatUnit } from '@/lib/utils';


function DetalleCierrePageContent() {
    const [cierre, setCierre] = useState<CierreInventario | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const router = useRouter();
    const params = useParams();
    const cierreId = params.id as string;
    
    useEffect(() => {
        const allCierres = JSON.parse(localStorage.getItem('cierresInventario') || '[]') as CierreInventario[];
        const currentCierre = allCierres.find(c => c.id === cierreId);
        setCierre(currentCierre || null);
        setIsMounted(true);
    }, [cierreId]);

    const filteredSnapshot = useMemo(() => {
        if (!cierre?.snapshotInventario) return [];
        return cierre.snapshotInventario.filter(item => 
            item.nombreProducto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.ubicacionNombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [cierre, searchTerm]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando detalle del cierre..." />;
    }

    if (!cierre) {
        return (
             <div className="text-center py-10">
                <h1 className="text-2xl font-bold">Cierre no encontrado</h1>
                <Button onClick={() => router.push('/cpr/cierres')} className="mt-4">
                    <ArrowLeft className="mr-2"/> Volver al Historial
                </Button>
            </div>
        )
    }

    return (
        <main>
            <div className="mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/cierres')}>
                    <ArrowLeft className="mr-2" /> Volver al historial
                </Button>
                 <h1 className="text-3xl font-headline font-bold mt-2">
                    Detalle del Cierre: <span className="text-primary capitalize">{format(new Date(`${cierre.mes}-02`), 'MMMM yyyy', {locale: es})}</span>
                </h1>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Snapshot del Inventario Final</CardTitle>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por producto o ubicación..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <CardDescription>
                        Valoración total del inventario al final del periodo: <strong>{formatCurrency(cierre.valorInventarioFinal)}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-[70vh] overflow-y-auto">
                        <Table>
                             <TableHeader className="sticky top-0 bg-secondary">
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead className="text-right">Stock Contabilizado</TableHead>
                                    <TableHead className="text-right">Valoración</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSnapshot.length > 0 ? filteredSnapshot.map(item => (
                                    <TableRow key={item.articuloErpId + item.ubicacionId}>
                                        <TableCell className="font-medium">{item.nombreProducto}</TableCell>
                                        <TableCell>{item.ubicacionNombre}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stock, 3)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.valoracion)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No se encontraron artículos.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}

export default function DetalleCierrePage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando..." />}>
            <DetalleCierrePageContent />
        </Suspense>
    )
}

