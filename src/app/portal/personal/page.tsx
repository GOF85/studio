'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, Calendar as CalendarIcon, CheckCircle, Clock, Factory, User, UserCog, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { PersonalExterno, PersonalExternoTurno, AsignacionPersonal, ServiceOrder, ComercialBriefing, PersonalExternoDB, PortalUser, Proveedor } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '../activity-log/utils';

// --- Helper Components ---

function AsignacionDialog({ turno, onSave }: { turno: PersonalExternoTurno; onSave: (turnoId: string, asignaciones: AsignacionPersonal[]) => void; }) {
    const [isOpen, setIsOpen] = useState(false);
    const [asignaciones, setAsignaciones] = useState<Partial<AsignacionPersonal>[]>([]);
    const [personalOptions, setPersonalOptions] = useState<{ label: string, value: string }[]>([]);

    const { impersonatedUser } = useImpersonatedUser();

    useEffect(() => {
        if (isOpen) {
            const allPersonalDB = (JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[])
                .filter(p => p.proveedorId === turno.proveedorId);

            setPersonalOptions(allPersonalDB.map(p => ({ label: p.nombreCompleto, value: p.id })));
            
            const initialAsignaciones = Array.from({ length: turno.cantidad || 1 }).map((_, i) => {
                const existing = turno.asignaciones?.[i];
                return existing ? { ...existing } : { id: `${turno.id}-${i}-${Date.now()}` };
            });
            setAsignaciones(initialAsignaciones);
        }
    }, [isOpen, turno, impersonatedUser]);

    const handleSelectPersonal = (index: number, personalId: string) => {
        const allPersonalDB = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        const personal = allPersonalDB.find(p => p.id === personalId);
        if (personal) {
            const newAsignaciones = [...asignaciones];
            newAsignaciones[index] = {
                ...newAsignaciones[index],
                id: personal.id,
                nombre: personal.nombreCompleto,
                dni: personal.id,
                telefono: personal.telefono || '',
                email: personal.email || ''
            };
            setAsignaciones(newAsignaciones);
        }
    };
    
    const handleSave = () => {
        const fullAsignaciones = asignaciones.filter(a => a.id && a.nombre) as AsignacionPersonal[];
        onSave(turno.id, fullAsignaciones);
        setIsOpen(false);
    };

    const numRequired = turno.cantidad || 1;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    {turno.statusPartner === 'Gestionado' ? 'Ver/Editar' : 'Asignar Personal'}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Asignar Personal para Turno</DialogTitle>
                    <DialogDescription>
                        {turno.categoria} - {format(new Date(turno.fecha), 'PPP', { locale: es })} de {turno.horaEntrada} a {turno.horaSalida}
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº</TableHead>
                                <TableHead className="w-1/3">Trabajador</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Comentarios</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: numRequired }).map((_, index) => {
                                const asignacion = asignaciones[index] || {};
                                return (
                                <TableRow key={index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Combobox
                                            options={personalOptions}
                                            value={asignacion.id || ''}
                                            onChange={(value) => handleSelectPersonal(index, value)}
                                            placeholder="Buscar trabajador..."
                                        />
                                    </TableCell>
                                    <TableCell>{asignacion.dni || '-'}</TableCell>
                                    <TableCell>{asignacion.telefono || '-'}</TableCell>
                                    <TableCell>
                                        <Textarea
                                            value={asignacion.comentarios || ''}
                                            onChange={(e) => {
                                                const newAsignaciones = [...asignaciones];
                                                if (!newAsignaciones[index]) newAsignaciones[index] = {};
                                                newAsignaciones[index].comentarios = e.target.value;
                                                setAsignaciones(newAsignaciones);
                                            }}
                                            rows={1}
                                            className="text-xs"
                                        />
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Asignaciones</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Page Component ---

export default function PortalPersonalPage() {
    const [pedidos, setPedidos] = useState<PersonalExterno[]>([]);
    const [serviceOrders, setServiceOrders] = useState<Map<string, ServiceOrder>>(new Map());
    const [briefings, setBriefings] = useState<Map<string, ComercialBriefing>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const { impersonatedUser } = useImpersonatedUser();
    const router = useRouter();
    const { toast } = useToast();

    const proveedorId = useMemo(() => impersonatedUser?.proveedorId, [impersonatedUser]);

    const loadData = useCallback(() => {
        const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
        const filteredPedidos = proveedorId 
            ? allPersonalExterno.map(p => ({
                ...p,
                turnos: p.turnos.filter(t => t.proveedorId === proveedorId)
              })).filter(p => p.turnos.length > 0)
            : allPersonalExterno;
        setPedidos(filteredPedidos);

        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        setServiceOrders(new Map(allServiceOrders.map(os => [os.id, os])));

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        setBriefings(new Map(allBriefings.map(b => [b.osId, b])));

        setIsMounted(true);
    }, [proveedorId]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleSaveAsignaciones = (turnoId: string, nuevasAsignaciones: AsignacionPersonal[]) => {
        if(!impersonatedUser) return;
        
        let allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
        let updated = false;

        allPersonalExterno = allPersonalExterno.map(pedido => ({
            ...pedido,
            turnos: pedido.turnos.map(turno => {
                if (turno.id === turnoId) {
                    updated = true;
                    return { ...turno, asignaciones: nuevasAsignaciones, statusPartner: 'Gestionado' };
                }
                return turno;
            })
        }));

        if (updated) {
            localStorage.setItem('personalExterno', JSON.stringify(allPersonalExterno));
            loadData();
            const turno = pedidos.flatMap(p => p.turnos).find(t => t.id === turnoId);
            if(turno) {
                const os = serviceOrders.get(pedidos.find(p => p.turnos.some(t => t.id === turnoId))!.osId);
                logActivity(impersonatedUser, 'Asignar Personal', `Asignados ${nuevasAsignaciones.length} trabajador(es) para el turno de ${turno.categoria}`, os?.serviceNumber || 'N/A');
            }
            toast({ title: 'Asignación guardada', description: 'El turno se ha actualizado con el personal asignado.' });
        }
    };
    
    const turnosAgrupados = useMemo(() => {
        const grouped: { [date: string]: { [osId: string]: { os: ServiceOrder; briefing: ComercialBriefingItem | undefined; turnos: PersonalExternoTurno[] } } } = {};

        pedidos.forEach(pedido => {
            const os = serviceOrders.get(pedido.osId);
            const briefing = briefings.get(pedido.osId);
            if (os) {
                pedido.turnos.forEach(turno => {
                    const dateKey = format(new Date(turno.fecha), 'yyyy-MM-dd');
                    if (!grouped[dateKey]) grouped[dateKey] = {};
                    if (!grouped[dateKey][os.id]) {
                        const hito = briefing?.items.find(item => isSameDay(new Date(item.fecha), new Date(turno.fecha)));
                        grouped[dateKey][os.id] = { os, briefing: hito, turnos: [] };
                    }
                    grouped[dateKey][os.id].turnos.push(turno);
                });
            }
        });

        return Object.entries(grouped)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, osData]) => ({ date, osEntries: Object.values(osData) }));
    }, [pedidos, serviceOrders, briefings]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Personal..." />;
    }
    
     if (impersonatedUser?.roles.includes('Partner Personal') && !proveedorId) {
        return (
             <main className="container mx-auto px-4 py-16">
                <Card className="max-w-xl mx-auto">
                    <CardHeader><CardTitle>Acceso Restringido</CardTitle></CardHeader>
                    <CardContent><p>Este usuario no está asociado a ningún proveedor de personal. Por favor, contacta con el administrador.</p></CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between border-b pb-4 mb-8">
                <div className="flex items-center gap-4">
                    <Users className="w-10 h-10 text-primary" />
                    <div>
                        <h1 className="text-3xl font-headline font-bold tracking-tight">Portal de Partner de Personal</h1>
                        <p className="text-muted-foreground">Gestiona los turnos y asigna a tu personal a los eventos.</p>
                    </div>
                </div>
            </div>

            {turnosAgrupados.length > 0 ? (
                <div className="space-y-6">
                    {turnosAgrupados.map(({ date, osEntries }) => (
                        <div key={date}>
                            <h2 className="text-2xl font-headline font-semibold mb-4 capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', { locale: es })}</h2>
                            <Accordion type="multiple" defaultValue={osEntries.map(e => e.os.id)} className="space-y-3">
                                {osEntries.map(({ os, briefing, turnos }) => (
                                    <AccordionItem value={os.id} key={os.id} className="border-none">
                                    <Card>
                                        <AccordionTrigger className="p-4 hover:no-underline">
                                            <div className="flex justify-between w-full pr-4">
                                                <div className="text-left">
                                                    <CardTitle className="text-lg">{os.serviceNumber} - {os.client}</CardTitle>
                                                    <CardDescription>{briefing?.descripcion || 'Varios servicios'}</CardDescription>
                                                </div>
                                                <Badge>{os.space}</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="px-4 pb-4">
                                                <Table>
                                                    <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead>Horario</TableHead><TableHead>Observaciones</TableHead><TableHead className="text-center">Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {turnos.map(turno => (
                                                            <TableRow key={turno.id} className={turno.statusPartner === 'Gestionado' ? 'bg-green-50' : ''}>
                                                                <TableCell className="font-semibold">{turno.cantidad || 1} x {turno.categoria}</TableCell>
                                                                <TableCell>{turno.horaEntrada} - {turno.horaSalida}</TableCell>
                                                                <TableCell className="text-xs text-muted-foreground">{turno.observaciones}</TableCell>
                                                                <TableCell className="text-center">
                                                                    <Badge variant={turno.statusPartner === 'Gestionado' ? 'success' : 'secondary'}>{turno.statusPartner}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <AsignacionDialog turno={turno} onSave={handleSaveAsignaciones} />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </AccordionContent>
                                    </Card>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Todo al día</h3>
                        <p className="mt-1 text-sm text-muted-foreground">No tienes solicitudes de personal pendientes.</p>
                    </CardContent>
                </Card>
            )}
        </main>
    );
}
