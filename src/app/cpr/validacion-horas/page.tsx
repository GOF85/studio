

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Calendar as CalendarIcon, CheckCircle, Pencil, AlertTriangle } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor, PersonalExternoDB, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { FeedbackDialog } from '@/components/portal/feedback-dialog';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' } = {
  'Solicitado': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Confirmado': 'success',
  'Solicitada Cancelacion': 'destructive',
  'Cerrado': 'secondary'
};

export default function ValidacionHorasPage() {
    const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
    const [personalExternoDB, setPersonalExternoDB] = useState<Map<string, { nombre: string }>>(new Map());
    const [personalInternoDB, setPersonalInternoDB] = useState<Map<string, { nombre: string }>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const [showClosed, setShowClosed] = useState(false);
    const [solicitudToClose, setSolicitudToClose] = useState<SolicitudPersonalCPR | null>(null);

    const router = useRouter();
    const { toast } = useToast();

    const loadData = useCallback(() => {
        const storedData = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[])
            .filter(s => s.estado === 'Confirmado' || s.estado === 'Asignada' || s.estado === 'Cerrado');
        setSolicitudes(storedData);

        const storedPersonalExterno = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        setPersonalExternoDB(new Map(storedPersonalExterno.map(p => [p.id, { nombre: p.nombreCompleto }])));

        const storedPersonalInterno = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalInternoDB(new Map(storedPersonalInterno.map(p => [p.id, { nombre: `${p.nombre} ${p.apellidos}` }])));

    }, []);

    useEffect(() => {
        loadData();
        setIsMounted(true);
    }, [loadData]);
    
    const filteredSolicitudes = useMemo(() => {
        return solicitudes.filter(s => {
            const isClosed = s.estado === 'Cerrado';
            if (!showClosed && isClosed) {
                return false;
            }

            const searchMatch = searchTerm === '' ||
                s.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.partida.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.personalAsignado?.[0]?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());

            const dateMatch = !dateFilter || isSameDay(new Date(s.fechaServicio), dateFilter);

            return searchMatch && dateMatch;
        }).sort((a,b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime());
    }, [solicitudes, searchTerm, dateFilter, showClosed]);
    
    const handleSaveHours = (solicitudId: string, asignacionId: string, field: 'horaEntradaReal' | 'horaSalidaReal', value: string) => {
        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        const reqIndex = allRequests.findIndex(r => r.id === solicitudId);
        if (reqIndex === -1) return;
        
        if (!allRequests[reqIndex].personalAsignado) return;
        const asigIndex = allRequests[reqIndex].personalAsignado!.findIndex(a => a.idPersonal === asignacionId);
        if (asigIndex === -1) return;

        allRequests[reqIndex].personalAsignado![asigIndex][field] = value;
        
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        setSolicitudes(prev => prev.map(s => s.id === solicitudId ? allRequests[reqIndex] : s));
    };
    
    const handleConfirmClose = (feedback: { rating: number; comment: string, horaEntradaReal?: string, horaSalidaReal?: string }) => {
        if (!solicitudToClose) return;

        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        const reqIndex = allRequests.findIndex(r => r.id === solicitudToClose.id);
        if (reqIndex === -1) return;
        
        const asignacion = allRequests[reqIndex].personalAsignado?.[0];
        if (!asignacion) return;

        if (!feedback.horaEntradaReal || !feedback.horaSalidaReal) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes introducir la hora de entrada y salida real para cerrar el turno.' });
            return;
        }

        allRequests[reqIndex].estado = 'Cerrado';
        allRequests[reqIndex].personalAsignado![0].rating = feedback.rating;
        allRequests[reqIndex].personalAsignado![0].comentariosMice = feedback.comment;
        allRequests[reqIndex].personalAsignado![0].horaEntradaReal = feedback.horaEntradaReal;
        allRequests[reqIndex].personalAsignado![0].horaSalidaReal = feedback.horaSalidaReal;

        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        loadData(); // Reload data to apply filters
        toast({ title: 'Turno Cerrado', description: `El turno de ${asignacion.nombre} ha sido validado y cerrado.` });
        setSolicitudToClose(null);
    };

    const getAssignedName = (asignacion?: {idPersonal: string, nombre?: string}) => {
        if(!asignacion) return 'No asignado';
        if(asignacion.nombre) return asignacion.nombre;
        const worker = personalExternoDB.get(asignacion.idPersonal) || personalInternoDB.get(asignacion.idPersonal);
        return worker?.nombre || 'Desconocido';
    }


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Validación de Horas..." />;
    }

    return (
        <TooltipProvider>
            <div>
                <div className="flex gap-4 mb-4">
                    <Input placeholder="Buscar por trabajador, categoría, motivo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm"/>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFilter ? format(dateFilter, 'PPP', { locale: es }) : <span>Filtrar por fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus />
                        </PopoverContent>
                    </Popover>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="show-closed" checked={showClosed} onCheckedChange={(checked) => setShowClosed(Boolean(checked))} />
                        <Label htmlFor="show-closed">Ver turnos cerrados</Label>
                    </div>
                    <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateFilter(undefined); }}>Limpiar</Button>
                </div>
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Trabajador</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>H. Planificadas</TableHead>
                                    <TableHead>H. Reales</TableHead>
                                    <TableHead>Coste Real</TableHead>
                                    <TableHead className="text-center">Valoración</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => {
                                    const asignacion = s.personalAsignado?.[0];
                                    if (!asignacion) return null;
                                    
                                    const horasPlanificadas = calculateHours(s.horaInicio, s.horaFin);
                                    const horasReales = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
                                    const costePlanificado = s.costeImputado || 0;
                                    const costeReal = horasReales > 0 && horasPlanificadas > 0 ? (costePlanificado / horasPlanificadas) * horasReales : 0;
                                    const desviacionHoras = horasReales - horasPlanificadas;

                                    const nombreAsignado = getAssignedName(asignacion);

                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-semibold">{nombreAsignado}</TableCell>
                                            <TableCell>{s.categoria}</TableCell>
                                            <TableCell>{s.horaInicio} - {s.horaFin} ({formatNumber(horasPlanificadas, 2)}h)</TableCell>
                                            <TableCell className={cn("font-mono font-semibold", desviacionHoras > 0 ? 'text-orange-600' : desviacionHoras < 0 ? 'text-green-600' : '')}>
                                                {formatNumber(horasReales, 2)}h
                                            </TableCell>
                                            <TableCell className="font-mono">{formatCurrency(costeReal)}</TableCell>
                                            <TableCell className="text-center">
                                                 <FeedbackDialog 
                                                    workerName={nombreAsignado}
                                                    initialRating={asignacion.rating}
                                                    initialComment={asignacion.comentariosMice}
                                                    initialHoraEntrada={asignacion.horaEntradaReal || s.horaInicio}
                                                    initialHoraSalida={asignacion.horaSalidaReal || s.horaFin}
                                                    onSave={(feedback) => handleConfirmClose({ ...s, personalAsignado: [{ ...asignacion, ...feedback }] } as any)}
                                                    isCloseMode={s.estado !== 'Cerrado'}
                                                    trigger={
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Pencil className={cn("h-4 w-4", (asignacion.rating || asignacion.comentariosMice) && 'text-primary')}/>
                                                        </Button>
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {s.estado !== 'Cerrado' ? (
                                                    <Button size="sm" onClick={() => setSolicitudToClose(s)}>
                                                        <CheckCircle className="mr-2"/>Cerrar Turno
                                                    </Button>
                                                ) : <Badge variant="secondary">Cerrado</Badge>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">No hay turnos pendientes de validación para los filtros seleccionados.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <FeedbackDialog
                    open={!!solicitudToClose}
                    onOpenChange={(isOpen) => !isOpen && setSolicitudToClose(null)}
                    workerName={getAssignedName(solicitudToClose?.personalAsignado?.[0])}
                    initialRating={solicitudToClose?.personalAsignado?.[0]?.rating}
                    initialComment={solicitudToClose?.personalAsignado?.[0]?.comentariosMice}
                    initialHoraEntrada={solicitudToClose?.personalAsignado?.[0]?.horaEntradaReal || solicitudToClose?.horaInicio}
                    initialHoraSalida={solicitudToClose?.personalAsignado?.[0]?.horaSalidaReal || solicitudToClose?.horaFin}
                    onSave={handleConfirmClose}
                    isCloseMode={true}
                    title="Confirmar Cierre y Valoración de Turno"
                    description="Verifica las horas reales e introduce la valoración del desempeño antes de cerrar el turno."
                    saveButtonText="Confirmar y Cerrar"
                 />
            </div>
        </TooltipProvider>
    );
}

```
- src/components/portal/feedback-dialog.tsx:
```tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Input } from '../ui/input';

interface FeedbackDialogProps {
  initialRating?: number;
  initialComment?: string;
  initialHoraEntrada?: string;
  initialHoraSalida?: string;
  workerName: string;
  onSave: (feedback: { rating: number; comment: string; horaEntradaReal?: string, horaSalidaReal?: string }) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isCloseMode?: boolean;
  title?: string;
  description?: string;
  saveButtonText?: string;
}

export function FeedbackDialog({
  initialRating,
  initialComment,
  initialHoraEntrada,
  initialHoraSalida,
  workerName,
  onSave,
  trigger,
  open,
  onOpenChange,
  isCloseMode = false,
  title = "Valoración",
  description = "Deja una valoración y comentarios sobre el desempeño.",
  saveButtonText = "Guardar Valoración"
}: FeedbackDialogProps) {
    const [rating, setRating] = useState(initialRating || 3);
    const [comment, setComment] = useState(initialComment || '');
    const [horaEntrada, setHoraEntrada] = useState(initialHoraEntrada || '');
    const [horaSalida, setHoraSalida] = useState(initialHoraSalida || '');
    
    useEffect(() => {
        if(open) {
            setRating(initialRating || 3);
            setComment(initialComment || '');
            setHoraEntrada(initialHoraEntrada || '');
            setHoraSalida(initialHoraSalida || '');
        }
    }, [open, initialRating, initialComment, initialHoraEntrada, initialHoraSalida]);

    const handleSave = () => {
        onSave({ rating, comment, horaEntradaReal: horaEntrada, horaSalidaReal: horaSalida });
    };

    const dialogContent = (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                 {isCloseMode && (
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <Label>Hora Entrada Real</Label>
                             <Input type="time" value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} />
                         </div>
                         <div className="space-y-2">
                            <Label>Hora Salida Real</Label>
                            <Input type="time" value={horaSalida} onChange={e => setHoraSalida(e.target.value)} />
                         </div>
                    </div>
                 )}
                <div className="space-y-2">
                    <Label>Desempeño (1-5)</Label>
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-sm text-muted-foreground">Bajo</span>
                        <Slider value={[rating]} onValueChange={(value) => setRating(value[0])} max={5} min={1} step={1} />
                        <span className="text-sm text-muted-foreground">Alto</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Comentarios Internos MICE</Label>
                    <Textarea 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        placeholder="Añade aquí comentarios internos sobre el desempeño..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => onOpenChange?.(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{saveButtonText}</Button>
            </DialogFooter>
        </DialogContent>
    );

    if (trigger) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                {dialogContent}
            </Dialog>
        );
    }
    
    return open ? dialogContent : null;
}
```
- src/lib/cpr-nav.ts:
```ts


'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer, ChefHat, BookHeart, Component, Sprout, CheckSquare, Shield, Users, UserCheck } from 'lucide-react';

export const cprNav = [
    { title: 'Panel de control', href: '/cpr/dashboard', icon: LayoutDashboard, description: 'Visión general del taller de producción.' },
    { title: 'Planificación y OFs', href: '/cpr/of', icon: Factory, description: 'Agrega necesidades y gestiona las O.F.' },
    { title: 'Taller de Producción', href: '/cpr/produccion', icon: ChefHat, description: 'Interfaz para cocineros en tablets.' },
    { title: 'Picking y Logística', href: '/cpr/picking', icon: ListChecks, description: 'Prepara las expediciones para eventos.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Solicitudes de Personal', href: '/cpr/solicitud-personal', icon: Users, description: 'Pide personal de apoyo para picos de trabajo.' },
    { title: 'Validación de Horas', href: '/cpr/validacion-horas', icon: UserCheck, description: 'Cierra y valora los turnos del personal de apoyo.'},
    { title: 'Stock Elaboraciones', href: '/cpr/excedentes', icon: PackagePlus, description: 'Consulta el inventario de elaboraciones.' },
    { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History, description: 'Consulta lotes y su histórico.' },
    { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción.' },
];

export const bookNavLinks = [
    { title: 'Panel de Control', path: '/book', icon: BookHeart, exact: true },
    { title: 'Recetas', path: '/book/recetas', icon: BookHeart },
    { title: 'Elaboraciones', path: '/book/elaboraciones', icon: Component },
    { title: 'Ingredientes', path: '/book/ingredientes', icon: ChefHat },
    { title: 'Verificación de Ingredientes', path: '/book/verificacionIngredientes', icon: Shield },
    { title: 'Revisión Gastronómica', path: '/book/revision-ingredientes', icon: CheckSquare },
    { title: 'Información de Alérgenos', path: '/book/alergenos', icon: Sprout },
    { title: 'Informe Gastronómico', path: '/book/informe', icon: BarChart3, exact: true },
];

    

```
- src/lib/rrhh-nav.ts:
```ts


'use client';

import { Users, ClipboardList, BarChart3, Factory, UserPlus } from 'lucide-react';

export const rrhhNav = [
    { title: 'Gestión de Solicitudes', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona todas las necesidades de personal para Eventos y CPR.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo (ETT)', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];


```