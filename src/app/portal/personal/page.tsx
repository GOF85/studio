
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Calendar as CalendarIcon, MessageSquare, Edit, Users, PlusCircle, Trash2, MapPin, Clock, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameMonth, isSameDay, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';


type TurnoConEstado = PersonalEntregaTurno & {
    osId: string;
    serviceNumber: string;
    cliente: string;
    fechaEntrega: string;
    horaEntrega: string;
    lugarEntrega: string;
};

const statusVariant: { [key in PersonalEntregaTurno['statusPartner']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente Asignación': 'secondary',
  'Gestionado': 'default',
  'Requiere Revisión': 'destructive',
};

const statusRowClass: { [key in PersonalEntregaTurno['statusPartner']]?: string } = {
  'Gestionado': 'bg-green-50 hover:bg-green-100/80',
  'Requiere Revisión': 'bg-amber-50 hover:bg-amber-100/80',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type DayDetails = {
    day: Date;
    events: TurnoConEstado[];
} | null;


function AsignacionDialog({ turno, onSave, children }: { turno: TurnoConEstado; onSave: (turnoId: string, asignaciones: AsignacionPersonal[]) => void; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [asignacion, setAsignacion] = useState<AsignacionPersonal>({ id: '1', nombre: '', dni: '', telefono: '', comentarios: '' });
    
    useEffect(() => {
        if(isOpen) {
             setAsignacion(turno.asignaciones?.[0] || { id: '1', nombre: '', dni: '', telefono: '', comentarios: '' });
        }
    }, [isOpen, turno.asignaciones]);

    const updateAsignacion = (field: keyof Omit<AsignacionPersonal, 'id'>, value: string) => {
        setAsignacion(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!asignacion.nombre) {
            alert("El nombre es obligatorio.");
            return;
        }
        onSave(turno.id, [asignacion]);
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Asignar Personal: {turno.categoria}</DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-sm text-muted-foreground pt-2 space-y-1">
                            <div className="flex items-center gap-2"><MapPin size={14}/> <strong>Dirección:</strong> {turno.lugarEntrega}</div>
                            <div className="flex items-center gap-2"><Clock size={14}/> <strong>Horario:</strong> {turno.horaEntrada} - {turno.horaSalida}</div>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor={`nombre-${asignacion.id}`}>Nombre y Apellidos</Label><Input id={`nombre-${asignacion.id}`} placeholder="Nombre completo" value={asignacion.nombre} onChange={e => updateAsignacion('nombre', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`dni-${asignacion.id}`}>DNI</Label><Input id={`dni-${asignacion.id}`} placeholder="DNI" value={asignacion.dni} onChange={e => updateAsignacion('dni', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`tel-${asignacion.id}`}>Teléfono</Label><Input id={`tel-${asignacion.id}`} placeholder="Teléfono de contacto" value={asignacion.telefono} onChange={e => updateAsignacion('telefono', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`com-${asignacion.id}`}>Comentarios</Label><Input id={`com-${asignacion.id}`} placeholder="Notas (opcional)" value={asignacion.comentarios} onChange={e => updateAsignacion('comentarios', e.target.value)} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Asignación</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PartnerPersonalPortalPage() {
    const [turnos, setTurnos] = useState<TurnoConEstado[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const { toast } = useToast();
    const [showCompleted, setShowCompleted] = useState(false);

    // State for Calendar View
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

    const loadData = useCallback(() => {
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]).filter(os => os.status === 'Confirmado');
        const allPersonalEntregas = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
        const allPedidosEntrega = (JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[]);

        const osMap = new Map(allEntregas.map(os => [os.id, os]));
        const pedidosMap = new Map(allPedidosEntrega.map(p => [p.osId, p]));
        
        const partnerTurnos: TurnoConEstado[] = [];

        allPersonalEntregas.forEach(pedido => {
            const os = osMap.get(pedido.osId);
            const osPedido = pedidosMap.get(pedido.osId);

            if (!os) return;

            (pedido.turnos || []).forEach(turno => {
                 const hito = osPedido?.hitos.find(h => new Date(h.fecha).toISOString().slice(0,10) === new Date(turno.fecha).toISOString().slice(0,10));
                 partnerTurnos.push({
                    ...turno,
                    osId: pedido.osId,
                    serviceNumber: os.serviceNumber,
                    cliente: os.client,
                    fechaEntrega: turno.fecha,
                    horaEntrega: turno.horaEntrada,
                    lugarEntrega: hito?.lugarEntrega || os.direccionPrincipal || 'No especificado',
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

        if (asignaciones.length >= updatedTurno.cantidad) {
            updatedTurno.statusPartner = 'Gestionado';
            updatedTurno.requiereActualizacion = false;
        } else {
            updatedTurno.statusPartner = 'Pendiente Asignación';
        }

        allPersonalEntregas[pedidoIndex].turnos[turnoIndex] = updatedTurno;

        localStorage.setItem('personalEntrega', JSON.stringify(allPersonalEntregas));
        
        loadData();
        toast({ title: 'Asignaciones guardadas' });
    }

    const filteredTurnos = useMemo(() => {
        return showCompleted ? turnos : turnos.filter(t => t.statusPartner !== 'Gestionado');
    }, [turnos, showCompleted]);

    const turnosAgrupadosPorDia = useMemo(() => {
        const groupedByDay: { [date: string]: { [location: string]: TurnoConEstado[] } } = {};
        
        filteredTurnos.forEach(turno => {
            const dateKey = format(new Date(turno.fechaEntrega), 'yyyy-MM-dd');
            if (!groupedByDay[dateKey]) {
                groupedByDay[dateKey] = {};
            }
            const locationKey = turno.lugarEntrega;
            if (!groupedByDay[dateKey][locationKey]) {
                groupedByDay[dateKey][locationKey] = [];
            }
            groupedByDay[dateKey][locationKey].push(turno);
        });

        return Object.entries(groupedByDay)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, locations]) => ({
                date,
                locations: Object.entries(locations).sort(([locA], [locB]) => locA.localeCompare(locB)),
            }));
    }, [filteredTurnos]);


    // --- Calendar Logic ---
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calStartDate, end: calEndDate });

     const eventsByDay = useMemo(() => {
        const grouped: { [dayKey: string]: TurnoConEstado[] } = {};
        turnos.forEach(event => {
            const dayKey = format(new Date(event.fechaEntrega), 'yyyy-MM-dd');
            if (!grouped[dayKey]) grouped[dayKey] = [];
            grouped[dayKey].push(event);
        });
        return grouped;
    }, [turnos]);

    const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
    const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));


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

            <Tabs defaultValue="lista">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="lista">Lista de Turnos</TabsTrigger>
                    <TabsTrigger value="calendario">Calendario</TabsTrigger>
                </TabsList>
                <TabsContent value="lista" className="mt-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <Checkbox id="show-completed" checked={showCompleted} onCheckedChange={(checked) => setShowCompleted(Boolean(checked))} />
                        <Label htmlFor="show-completed">Mostrar turnos gestionados</Label>
                    </div>
                    {turnosAgrupadosPorDia.length > 0 ? (
                        <div className="space-y-4">
                            {turnosAgrupadosPorDia.map(({ date, locations }) => (
                                <Card key={date}>
                                    <CardHeader className="p-4">
                                        <CardTitle className="flex items-center gap-3">
                                            <CalendarIcon className="h-6 w-6"/>
                                            <span className="capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0 space-y-4">
                                        {locations.map(([location, dailyTurnos]) => (
                                            <Accordion key={location} type="single" collapsible defaultValue="item-1">
                                                <AccordionItem value="item-1">
                                                    <AccordionTrigger className="bg-muted/50 px-3 rounded-t-md">
                                                         <div className="flex items-center gap-3">
                                                            <MapPin className="h-5 w-5 text-muted-foreground"/>
                                                            <div>
                                                                <h4 className="font-semibold text-left">{location}</h4>
                                                                <p className="text-sm text-muted-foreground text-left">{dailyTurnos.length} empleados requeridos</p>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="border border-t-0 rounded-b-md">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Pedido (Cliente)</TableHead>
                                                                    <TableHead>Categoría</TableHead>
                                                                    <TableHead>Horario</TableHead>
                                                                    <TableHead>Observaciones MICE</TableHead>
                                                                    <TableHead>Asignaciones</TableHead>
                                                                    <TableHead>Estado</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {dailyTurnos.map(turno => (
                                                                    <TableRow key={turno.id} className={cn("transition-colors", statusRowClass[turno.statusPartner || 'Pendiente Asignación'])}>
                                                                        <TableCell>
                                                                            <Badge variant="secondary">{turno.serviceNumber}</Badge>
                                                                            <p className="text-xs text-muted-foreground">{turno.cliente}</p>
                                                                        </TableCell>
                                                                        <TableCell className="font-semibold">{turno.categoria}</TableCell>
                                                                        <TableCell>{turno.horaEntrada} - {turno.horaSalida}</TableCell>
                                                                        <TableCell className="text-sm text-muted-foreground max-w-xs">{turno.observaciones}</TableCell>
                                                                        <TableCell>
                                                                            <AsignacionDialog turno={turno} onSave={handleSaveAsignaciones}>
                                                                                <Button variant="outline" size="sm">
                                                                                    <Edit className="mr-2 h-3 w-3"/>
                                                                                    Gestionar
                                                                                </Button>
                                                                            </AsignacionDialog>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant={statusVariant[turno.statusPartner || 'Pendiente Asignación']}>{turno.statusPartner || 'Pendiente Asignación'}</Badge>
                                                                            {turno.requiereActualizacion && (
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <span className="ml-2 flex h-3 w-3 relative">
                                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                                                                        </span>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>
                                                                                        <p>La cantidad solicitada ha cambiado. Por favor, revisa las asignaciones.</p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">Todo al día</h3>
                                <p className="mt-1 text-sm text-muted-foreground">No hay turnos de personal pendientes.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="calendario" className="mt-6">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                        <h2 className="text-xl font-semibold w-40 text-center capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
                        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                     <div className="border rounded-lg">
                        <div className="grid grid-cols-7 border-b">
                            {WEEKDAYS.map(day => (
                            <div key={day} className="text-center font-bold p-2 text-xs text-muted-foreground">
                                {day}
                            </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-fr">
                            {calendarDays.map((day) => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const dayEvents = eventsByDay[dayKey] || [];
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={day.toString()}
                                        className={cn(
                                            'h-20 border-r border-b p-1 flex flex-col',
                                            !isCurrentMonth && 'bg-muted/50 text-muted-foreground',
                                            'last:border-r-0',
                                            dayEvents.length > 0 && 'cursor-pointer hover:bg-secondary'
                                        )}
                                        onClick={() => dayEvents.length > 0 && setDayDetails({ day, events: dayEvents })}
                                    >
                                        <span className={cn('font-semibold text-xs', isToday && 'text-primary font-bold flex items-center justify-center h-5 w-5 rounded-full bg-primary/20')}>
                                            {format(day, 'd')}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <div className="mt-1 flex justify-center">
                                                <span className="h-2 w-2 rounded-full bg-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
         </main>

        <Dialog open={!!dayDetails} onOpenChange={(open) => !open && setDayDetails(null)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Turnos para el {dayDetails?.day ? format(dayDetails.day, 'PPP', { locale: es }) : ''}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
                    {dayDetails && dayDetails.events.map((event) => (
                        <div key={event.id} className="block p-3 hover:bg-muted rounded-md">
                            <p className="font-bold text-primary">{event.categoria}</p>
                            <p>Pedido: {event.serviceNumber} ({event.cliente})</p>
                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                                <span><span className="font-semibold">Cantidad:</span> {event.cantidad}</span>
                                <span><span className="font-semibold">Horario:</span> {event.horaEntrada} - {event.horaSalida}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
        </TooltipProvider>
    );
}
