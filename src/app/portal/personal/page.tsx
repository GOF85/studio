
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Calendar as CalendarIcon, MessageSquare, Edit, Users, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatUnit } from '@/lib/utils';
import type { PersonalEntrega, PersonalEntregaTurno, AsignacionPersonal, EstadoPersonalEntrega, Entrega, PedidoEntrega } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TurnoConEstado = PersonalEntregaTurno & {
    osId: string;
    serviceNumber: string;
    cliente: string;
    fechaEntrega: string;
    horaEntrega: string;
};

const statusVariant: { [key in PersonalEntregaTurno['statusPartner']]: 'default' | 'secondary' | 'outline' } = {
  'Pendiente Asignación': 'secondary',
  'Gestionado': 'default',
};

const statusRowClass: { [key in PersonalEntregaTurno['statusPartner']]?: string } = {
  'Gestionado': 'bg-green-50 hover:bg-green-100/80',
};


function AsignacionDialog({ turno, onSave, children }: { turno: TurnoConEstado; onSave: (turnoId: string, asignaciones: AsignacionPersonal[]) => void; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [asignaciones, setAsignaciones] = useState<AsignacionPersonal[]>(turno.asignaciones || []);

    const addAsignacion = () => setAsignaciones(prev => [...prev, { id: Date.now().toString(), nombre: '', dni: '' }]);
    const removeAsignacion = (id: string) => setAsignaciones(prev => prev.filter(a => a.id !== id));
    
    const updateAsignacion = (id: string, field: 'nombre' | 'dni', value: string) => {
        setAsignaciones(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const handleSave = () => {
        onSave(turno.id, asignaciones);
        setIsOpen(false);
    }
    
    const remaining = turno.cantidad - asignaciones.length;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Asignar Personal: {turno.categoria}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <p>Necesitas asignar <strong>{turno.cantidad}</strong> persona(s). {remaining > 0 ? `Faltan ${remaining}.` : 'Completado.'}</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {asignaciones.map((asignacion, index) => (
                            <div key={asignacion.id} className="flex items-center gap-2 p-2 border rounded-md">
                                <span className="font-bold">{index + 1}.</span>
                                <Input placeholder="Nombre y Apellidos" value={asignacion.nombre} onChange={e => updateAsignacion(asignacion.id, 'nombre', e.target.value)} />
                                <Input placeholder="DNI" value={asignacion.dni} onChange={e => updateAsignacion(asignacion.id, 'dni', e.target.value)} className="w-32"/>
                                <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => removeAsignacion(asignacion.id)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        ))}
                    </div>
                    {remaining > 0 && (
                        <Button variant="outline" size="sm" onClick={addAsignacion}><PlusCircle className="mr-2"/>Añadir Persona</Button>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Asignaciones</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PartnerPersonalPortalPage() {
    const [turnos, setTurnos] = useState<TurnoConEstado[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const { toast } = useToast();

    const loadData = useCallback(() => {
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]).filter(os => os.status === 'Confirmado');
        const allPersonalEntregas = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];

        const osMap = new Map(allEntregas.map(os => [os.id, os]));
        const partnerTurnos: TurnoConEstado[] = [];

        allPersonalEntregas.forEach(pedido => {
            const os = osMap.get(pedido.osId);
            if (!os) return;

            (pedido.turnos || []).forEach(turno => {
                partnerTurnos.push({
                    ...turno,
                    osId: pedido.osId,
                    serviceNumber: os.serviceNumber,
                    cliente: os.client,
                    fechaEntrega: turno.fecha,
                    horaEntrega: turno.horaEntrada,
                });
            });
        });
        
        setTurnos(partnerTurnos);
        setIsMounted(true);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleSaveAsignaciones = (turnoId: string, asignaciones: AsignacionPersonal[]) => {
        const turno = turnos.find(t => t.id === turnoId);
        if(!turno) return;

        const allPersonalEntregas = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
        const pedidoIndex = allPersonalEntregas.findIndex(p => p.osId === turno.osId);
        if(pedidoIndex === -1) return;

        const turnoIndex = allPersonalEntregas[pedidoIndex].turnos.findIndex(t => t.id === turnoId);
        if(turnoIndex === -1) return;

        const updatedTurno = { ...allPersonalEntregas[pedidoIndex].turnos[turnoIndex] };
        updatedTurno.asignaciones = asignaciones;

        // Auto-update status if all assignments are filled
        if (asignaciones.length >= updatedTurno.cantidad) {
            updatedTurno.statusPartner = 'Gestionado';
        } else {
            updatedTurno.statusPartner = 'Pendiente Asignación';
        }

        allPersonalEntregas[pedidoIndex].turnos[turnoIndex] = updatedTurno;

        localStorage.setItem('personalEntrega', JSON.stringify(allPersonalEntregas));
        
        loadData();
        toast({ title: 'Asignaciones guardadas' });
    }

    const turnosAgrupadosPorDia = useMemo(() => {
        const grouped: { [key: string]: TurnoConEstado[] } = {};
        turnos.forEach(turno => {
            const dateKey = format(new Date(turno.fechaEntrega), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(turno);
        });
        return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [turnos]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Personal..." />;
    }

    return (
        <TooltipProvider>
         <main className="container mx-auto px-4 py-8">
             <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Users className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Portal de Partner de Personal</h1>
                    <p className="text-lg text-muted-foreground">Listado de turnos de personal pendientes de gestionar.</p>
                </div>
            </div>

            <div className="space-y-4">
                {turnosAgrupadosPorDia.length > 0 ? (
                    turnosAgrupadosPorDia.map(([date, dailyTurnos]) => (
                        <Card key={date}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <CalendarIcon className="h-6 w-6"/>
                                    <span className="capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pedido (Cliente)</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead>Cantidad</TableHead>
                                            <TableHead>Horario</TableHead>
                                            <TableHead>Observaciones MICE</TableHead>
                                            <TableHead>Asignaciones</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dailyTurnos.map(turno => (
                                            <TableRow key={turno.id} className={cn("transition-colors", statusRowClass[turno.statusPartner])}>
                                                <TableCell>
                                                    <Badge variant="secondary">{turno.serviceNumber}</Badge>
                                                    <p className="text-xs text-muted-foreground">{turno.cliente}</p>
                                                </TableCell>
                                                <TableCell className="font-semibold">{turno.categoria}</TableCell>
                                                <TableCell className="font-mono text-center">{turno.cantidad}</TableCell>
                                                <TableCell>{turno.horaEntrada} - {turno.horaSalida}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-xs">{turno.observaciones}</TableCell>
                                                <TableCell>
                                                    <AsignacionDialog turno={turno} onSave={handleSaveAsignaciones}>
                                                        <Button variant="outline" size="sm">
                                                            <Edit className="mr-2 h-3 w-3"/>
                                                            Gestionar ({turno.asignaciones?.length || 0}/{turno.cantidad})
                                                        </Button>
                                                    </AsignacionDialog>
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant={statusVariant[turno.statusPartner]}>{turno.statusPartner}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Todo al día</h3>
                            <p className="mt-1 text-sm text-muted-foreground">No hay turnos de personal pendientes.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
         </main>
        </TooltipProvider>
    );
}
