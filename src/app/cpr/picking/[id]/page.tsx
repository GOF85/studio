'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, ArrowLeft, ThermometerSnowflake, Archive, PlusCircle, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import type { ServiceOrder, GastronomyOrder, Receta, Elaboracion, ContenedorIsotermo } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


type ElaboracionNecesaria = {
    id: string;
    nombre: string;
    cantidad: number;
    unidad: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    recetaContenedora: string;
    isPicked: boolean;
    containerId?: string;
};

type AssignedContainer = {
    id: string;
    nombre: string;
}

export default function PickingDetailPage() {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [necesidades, setNecesidades] = useState<ElaboracionNecesaria[]>([]);
    const [dbContainers, setDbContainers] = useState<ContenedorIsotermo[]>([]);
    const [assignedContainers, setAssignedContainers] = useState<{[key in Elaboracion['tipoExpedicion']]?: AssignedContainer[]}>({});
    const [isMounted, setIsMounted] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;

    useEffect(() => {
        if (osId) {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
            const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
            const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
            const allContainers = JSON.parse(localStorage.getItem('contenedoresDB') || '[]') as ContenedorIsotermo[];
            setDbContainers(allContainers);
            
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
                                        recetaContenedora: receta.nombre,
                                        isPicked: false,
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

    const addContainerToSection = (tipo: Elaboracion['tipoExpedicion'], container: ContenedorIsotermo) => {
        setAssignedContainers(prev => {
            const currentSectionContainers = prev[tipo] || [];
            if(currentSectionContainers.some(c => c.id === container.id)) return prev; // Avoid duplicates
            return {
                ...prev,
                [tipo]: [...currentSectionContainers, container]
            }
        })
    };

    const assignElaboracionToContainer = (elaboracionId: string, containerId: string) => {
        setNecesidades(prev => prev.map(nec => 
            nec.id === elaboracionId ? { ...nec, isPicked: true, containerId: containerId } : nec
        ));
    };

    const unassignElaboracion = (elaboracionId: string) => {
        setNecesidades(prev => prev.map(nec => 
            nec.id === elaboracionId ? { ...nec, isPicked: false, containerId: undefined } : nec
        ));
    }


    const necesidadesAgrupadas = useMemo(() => {
        const grouped: {[key in Elaboracion['tipoExpedicion']]?: ElaboracionNecesaria[]} = {};
        necesidades.forEach(nec => {
            if (!grouped[nec.tipoExpedicion]) {
                grouped[nec.tipoExpedicion] = [];
            }
            grouped[nec.tipoExpedicion]!.push(nec);
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
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/picking')} className="mb-2 no-print">
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
                <Button onClick={() => window.print()} className="no-print">
                    Imprimir Hoja de Picking
                </Button>
            </div>

            <div className="space-y-8">
                {(Object.keys(necesidadesAgrupadas) as Array<keyof typeof necesidadesAgrupadas>).map(tipo => {
                    const sectionNeeds = necesidadesAgrupadas[tipo] || [];
                    const pendingNeeds = sectionNeeds.filter(n => !n.isPicked);
                    const info = expeditionTypeMap[tipo];
                    const sectionContainers = assignedContainers[tipo] || [];
                    if (sectionNeeds.length === 0) return null;

                    return (
                        <Card key={tipo} className={cn(info.className, "print-section")}>
                            <CardHeader className="flex-row items-start justify-between">
                                <CardTitle className="flex items-center gap-3">
                                    <info.icon />
                                    {info.title}
                                </CardTitle>
                                 <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="no-print bg-white/50"><PlusCircle className="mr-2"/>Asignar Contenedor</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Seleccionar Contenedores para {info.title}</DialogTitle></DialogHeader>
                                        <div className="space-y-2 py-4">
                                            {dbContainers.map(c => (
                                                 <div key={c.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`cont-${c.id}`}
                                                        checked={sectionContainers.some(sc => sc.id === c.id)}
                                                        onCheckedChange={(checked) => {
                                                            if(checked) { addContainerToSection(tipo, c) }
                                                            // Logic to remove would be here, if needed
                                                        }}
                                                    />
                                                    <label htmlFor={`cont-${c.id}`} className="font-medium">{c.nombre} <span className="text-muted-foreground">({c.id})</span></label>
                                                </div>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                {pendingNeeds.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="font-semibold text-lg mb-2">Elaboraciones pendientes de asignar</h3>
                                        <Table className="bg-white">
                                            <TableHeader><TableRow><TableHead>Elaboración (Receta)</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="w-48 no-print"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {pendingNeeds.map(nec => (
                                                    <TableRow key={nec.id}>
                                                        <TableCell className="font-medium">{nec.nombre} <span className="text-muted-foreground text-xs">({nec.recetaContenedora})</span></TableCell>
                                                        <TableCell className="text-right font-mono">{nec.cantidad.toFixed(2)} {nec.unidad}</TableCell>
                                                         <TableCell className="text-right no-print">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="secondary" size="sm" disabled={sectionContainers.length === 0}>Asignar</Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-56 p-0">
                                                                     <Command>
                                                                        <CommandInput placeholder="Buscar contenedor..."/>
                                                                        <CommandList>
                                                                            <CommandEmpty>No hay contenedores.</CommandEmpty>
                                                                            <CommandGroup>
                                                                                {sectionContainers.map(c => (
                                                                                    <CommandItem key={c.id} onSelect={() => assignElaboracionToContainer(nec.id, c.id)}>{c.nombre} ({c.id})</CommandItem>
                                                                                ))}
                                                                            </CommandGroup>
                                                                        </CommandList>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                         </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                                
                                <div className="space-y-6">
                                    {sectionContainers.map(container => {
                                        const containerItems = sectionNeeds.filter(n => n.containerId === container.id);
                                        return (
                                            <div key={container.id}>
                                                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">Contenedor: <Badge variant="secondary" className="text-base">{container.nombre} ({container.id})</Badge></h3>
                                                <Table className="bg-white/70">
                                                    <TableHeader><TableRow><TableHead>Elaboración (Receta)</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="w-16 no-print"></TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                         {containerItems.length === 0 ? (
                                                            <TableRow><TableCell colSpan={3} className="text-center h-20 text-muted-foreground">Vacío</TableCell></TableRow>
                                                         ) : (
                                                            containerItems.map(item => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell className="font-medium">{item.nombre} <span className="text-muted-foreground text-xs">({item.recetaContenedora})</span></TableCell>
                                                                    <TableCell className="text-right font-mono">{item.cantidad.toFixed(2)} {item.unidad}</TableCell>
                                                                    <TableCell className="no-print"><Button variant="ghost" size="sm" onClick={() => unassignElaboracion(item.id)}>Quitar</Button></TableCell>
                                                                </TableRow>
                                                            ))
                                                         )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
