'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, ArrowLeft, ThermometerSnowflake, ThermometerSun, Archive } from 'lucide-react';
import { format } from 'date-fns';
import type { ServiceOrder, GastronomyOrder, Receta, Elaboracion, GastronomyOrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ElaboracionNecesaria = {
    id: string;
    nombre: string;
    cantidad: number;
    unidad: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    recetaContenedora: string;
};

type NecesidadesAgrupadas = {
    [key in Elaboracion['tipoExpedicion']]: {
        [receta: string]: ElaboracionNecesaria[];
    };
};

export default function PickingDetailPage() {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [necesidades, setNecesidades] = useState<ElaboracionNecesaria[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;

    useEffect(() => {
        if (osId) {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            // Calculate needs
            const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
            const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
            const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
            
            const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
            const elaboracionesMap = new Map(allElaboraciones.map(e => [e.id, e]));

            const osGastroOrders = allGastroOrders.filter(go => go.osId === osId);
            
            const allNecesidades: ElaboracionNecesaria[] = [];

            osGastroOrders.forEach(order => {
                (order.items || []).forEach(item => {
                    if (item.type === 'item') {
                        const receta = recetasMap.get(item.id);
                        if (receta) {
                            receta.elaboraciones.forEach(elabEnReceta => {
                                const elaboracion = elaboracionesMap.get(elabEnReceta.elaboracionId);
                                if (elaboracion) {
                                    const cantidadNecesaria = (item.quantity || 0) * elabEnReceta.cantidad;
                                    allNecesidades.push({
                                        id: elaboracion.id + '-' + receta.id,
                                        nombre: elaboracion.nombre,
                                        cantidad: cantidadNecesaria,
                                        unidad: elaboracion.unidadProduccion,
                                        tipoExpedicion: elaboracion.tipoExpedicion,
                                        recetaContenedora: receta.nombre
                                    });
                                }
                            });
                        }
                    }
                });
            });
            setNecesidades(allNecesidades);
        }
        setIsMounted(true);
    }, [osId]);

    const necesidadesAgrupadas = useMemo(() => {
        const grouped: NecesidadesAgrupadas = {
            REFRIGERADO: {},
            CONGELADO: {},
            SECO: {},
        };

        necesidades.forEach(nec => {
            if (!grouped[nec.tipoExpedicion][nec.recetaContenedora]) {
                grouped[nec.tipoExpedicion][nec.recetaContenedora] = [];
            }
            grouped[nec.tipoExpedicion][nec.recetaContenedora].push(nec);
        });

        return grouped;
    }, [necesidades]);

    if (!isMounted || !serviceOrder) {
        return <LoadingSkeleton title="Cargando Picking..." />;
    }

    const expeditionTypeMap = {
        REFRIGERADO: { title: "Refrigerado", icon: ThermometerSnowflake, className: "bg-blue-100 border-blue-200" },
        CONGELADO: { title: "Congelado", icon: ThermometerSnowflake, className: "bg-sky-100 border-sky-200" },
        SECO: { title: "Seco", icon: Archive, className: "bg-amber-100 border-amber-200" },
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/picking')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Package />
                        Hoja de Picking: {serviceOrder.serviceNumber}
                    </h1>
                    <CardDescription>
                        Cliente: {serviceOrder.client} | Fecha: {format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}
                    </CardDescription>
                </div>
                <Button disabled>
                    Imprimir Hoja de Picking
                </Button>
            </div>

            <div className="space-y-8">
                {(Object.keys(necesidadesAgrupadas) as Array<keyof NecesidadesAgrupadas>).map(tipo => {
                    const recetas = necesidadesAgrupadas[tipo];
                    const info = expeditionTypeMap[tipo];
                    if (Object.keys(recetas).length === 0) return null;

                    return (
                        <Card key={tipo} className={info.className}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <info.icon />
                                    {info.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(recetas).map(recetaNombre => (
                                    <div key={recetaNombre} className="mb-6 last:mb-0">
                                        <h3 className="font-semibold text-lg border-b pb-2 mb-2">Kit Receta: {recetaNombre}</h3>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Elaboración</TableHead>
                                                    <TableHead className="text-right">Cantidad Necesaria</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recetas[recetaNombre].map(nec => (
                                                    <TableRow key={nec.id}>
                                                        <TableCell className="font-medium">{nec.nombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{nec.cantidad.toFixed(2)} {nec.unidad}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
