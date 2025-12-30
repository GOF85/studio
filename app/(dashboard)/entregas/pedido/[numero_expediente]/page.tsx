

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, Trash2, Package, Save, X, Truck, PlusCircle, Pencil, Printer } from 'lucide-react';

import type { Entrega, ProductoVenta, PedidoEntrega, PedidoEntregaItem, TransporteOrder, EntregaHito, ProveedorTransporte, ServiceOrder } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

import { useEntrega, useUpdateEntrega, useCreateEntrega, usePedidosEntrega, useTransporteOrders, useProveedores, useTiposTransporte, useProveedoresTransporte, useArticulos } from '@/hooks/use-data-queries';
import { useSyncTransporteOrders } from '@/hooks/mutations/use-transporte-mutations';
import { entregaFormSchema, type EntregaFormValues } from '@/types/entregas';

const defaultValues: Partial<EntregaFormValues> = {
    serviceNumber: '',
    client: '',
    asistentes: 1,
    contact: '',
    phone: '',
    email: '',
    finalClient: '',
    status: 'Borrador',
    tarifa: 'Empresa',
    tipoCliente: 'Empresa',
    comercial: '',
    agencyPercentage: 0,
    agencyCommissionValue: 0,
    spacePercentage: 0,
    spaceCommissionValue: 0,
    comisionesAgencia: 0,
    comisionesCanon: 0,
    facturacion: 0,
    plane: '',
    comments: '',
    deliveryLocations: [],
    direccionPrincipal: '',
};

const hitoDialogSchema = z.object({
    id: z.string(),
    fecha: z.date(),
    hora: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
    lugarEntrega: z.string().min(1, "El lugar de entrega es obligatorio"),
    localizacion: z.string().optional(),
    contacto: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email().or(z.literal('')).optional(),
    observaciones: z.string().optional(),
});
type HitoDialogFormValues = z.infer<typeof hitoDialogSchema>;


function HitoDialog({ onSave, initialData, os, children }: { onSave: (data: EntregaHito) => void; initialData?: Partial<EntregaHito>; os: Partial<Entrega> | null, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const form = useForm<HitoDialogFormValues>({
        resolver: zodResolver(hitoDialogSchema),
        defaultValues: {
            id: initialData?.id || Date.now().toString(),
            fecha: initialData?.fecha ? new Date(initialData.fecha) : (os?.startDate ? new Date(os.startDate) : new Date()),
            hora: initialData?.hora || '10:00',
            lugarEntrega: initialData?.lugarEntrega || os?.direccionPrincipal || '',
            localizacion: initialData?.localizacion || '',
            contacto: initialData?.contacto || os?.contact || '',
            telefono: initialData?.telefono || os?.phone || '',
            email: initialData?.email || os?.email || '',
            observaciones: initialData?.observaciones || '',
        }
    });

    const handleSubmit = (data: HitoDialogFormValues) => {
        onSave({
            ...data,
            fecha: format(data.fecha, 'yyyy-MM-dd'),
            items: initialData?.items || [],
        });
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader><DialogTitle>{initialData ? 'Editar' : 'Nueva'} Entrega</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="hora" render={({ field }) => (
                                <FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="lugarEntrega" render={({ field }) => (
                            <FormItem><FormLabel>Lugar de Entrega (Dirección)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="localizacion" render={({ field }) => (
                            <FormItem><FormLabel>Localización (ej. Sala, Stand, etc.)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-3 gap-4">
                            <FormField control={form.control} name="contacto" render={({ field }) => (<FormItem><FormLabel>Contacto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="telefono" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const ClienteTitle = () => {
    const { watch } = useFormContext();
    const client = watch('client');
    const finalClient = watch('finalClient');
    return (
        <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Información del Cliente</h3>
            {(client || finalClient) && (
                <span className="text-lg font-bold text-primary text-right">
                    {client}{finalClient && ` / ${finalClient}`}
                </span>
            )}
        </div>
    )
};

const ClientInfo = () => {
    const { control } = useFormContext();
    return (
        <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-2">
                <FormField control={control} name="client" render={({ field }) => (
                    <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="tipoCliente" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo Cliente</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Empresa">Empresa</SelectItem>
                                <SelectItem value="Agencia">Agencia</SelectItem>
                                <SelectItem value="Particular">Particular</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                )} />
                <FormField control={control} name="finalClient" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cliente Final</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="contact" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Contacto Principal</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono Principal</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Principal</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="direccionPrincipal" render={({ field }) => (
                    <FormItem className="col-span-full"><FormLabel>Dirección Principal de Entrega</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
            </div>
        </AccordionContent>
    );
};

const FinancialTitle = ({ pvpBruto }: { pvpBruto: number }) => {
    const { watch } = useFormContext();
    const agencyPercentage = watch('agencyPercentage');
    const agencyCommissionValue = watch('agencyCommissionValue');
    const spacePercentage = watch('spacePercentage');
    const spaceCommissionValue = watch('spaceCommissionValue');

    const pvpNeto = useMemo(() => {
        const agencyDiscount = pvpBruto * ((agencyPercentage || 0) / 100);
        const spaceDiscount = pvpBruto * ((spacePercentage || 0) / 100);
        return pvpBruto - agencyDiscount - (agencyCommissionValue || 0) - spaceDiscount - (spaceCommissionValue || 0);
    }, [pvpBruto, agencyPercentage, agencyCommissionValue, spacePercentage, spaceCommissionValue]);

    return (
        <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Información Financiera</h3>
            <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Bruto: {formatCurrency(pvpBruto)}</p>
                <p className="text-2xl font-bold text-green-600">Neto: {formatCurrency(pvpNeto)}</p>
            </div>
        </div>
    )
}

function TransporteDialog({ onSave, osId, hitos, existingTransportOrders }: { onSave: (order: Omit<TransporteOrder, 'id'>) => void; osId: string; hitos: EntregaHito[]; existingTransportOrders: TransporteOrder[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedHitos, setSelectedHitos] = useState<Set<string>>(new Set());
    const [tipoTransporteId, setTipoTransporteId] = useState<string>('');
    
    const { data: tiposData } = useTiposTransporte();
    const tiposTransporte = useMemo(() => {
        return (tiposData || []) as any[];
    }, [tiposData]);

    const assignedHitoIds = useMemo(() => {
        return new Set(existingTransportOrders.flatMap(t => t.hitosIds || []));
    }, [existingTransportOrders]);

    const selectedTipo = useMemo(() => tiposTransporte.find(t => t.id === tipoTransporteId), [tipoTransporteId, tiposTransporte]);

    const handleSave = () => {
        if (selectedHitos.size === 0 || !selectedTipo) {
            alert("Por favor, selecciona al menos una entrega y un tipo de transporte.");
            return;
        }

        const firstHito = hitos.find(h => selectedHitos.has(h.id));
        if (!firstHito) return;

        onSave({
            osId,
            fecha: firstHito.fecha,
            proveedorId: selectedTipo.proveedor_id || '',
            proveedorNombre: selectedTipo.proveedor?.nombre_comercial || 'Sin proveedor',
            tipoTransporte: selectedTipo.nombre,
            precio: selectedTipo.precio_base || 0,
            lugarRecogida: 'C. Mallorca, 1, 28703 San Sebastián de los Reyes, Madrid',
            horaRecogida: '09:00',
            lugarEntrega: firstHito.lugarEntrega,
            horaEntrega: firstHito.hora,
            observaciones: '',
            status: 'Pendiente',
            hitosIds: Array.from(selectedHitos),
        });
        setIsOpen(false);
        setSelectedHitos(new Set());
        setTipoTransporteId('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2" />Asignar Transporte</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Asignar Transporte</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <h4 className="font-semibold mb-2">1. Selecciona las entregas a incluir:</h4>
                        <div className="space-y-2 border p-2 rounded-md max-h-40 overflow-y-auto">
                            {hitos.map((hito, index) => {
                                const isAssigned = assignedHitoIds.has(hito.id);
                                const assignedProvider = isAssigned
                                    ? existingTransportOrders.find(t => t.hitosIds?.includes(hito.id))?.proveedorNombre
                                    : null;
                                return (
                                    <div key={hito.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`hito-${hito.id}`}
                                            checked={selectedHitos.has(hito.id)}
                                            onCheckedChange={(checked) => {
                                                const newSelection = new Set(selectedHitos);
                                                if (checked) newSelection.add(hito.id);
                                                else newSelection.delete(hito.id);
                                                setSelectedHitos(newSelection);
                                            }}
                                            disabled={isAssigned}
                                        />
                                        <label htmlFor={`hito-${hito.id}`} className={cn("text-sm font-medium leading-none", isAssigned && "text-muted-foreground line-through")}>
                                            #{index + 1} - {hito.lugarEntrega} ({format(new Date(hito.fecha), 'dd/MM/yy')} {hito.hora})
                                        </label>
                                        {isAssigned && <Badge variant="secondary">{assignedProvider}</Badge>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">2. Selecciona un tipo de transporte:</h4>
                        <Select onValueChange={setTipoTransporteId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar transporte..." /></SelectTrigger>
                            <SelectContent>
                                {tiposTransporte.map(t => (
                                    <SelectItem key={t.id} value={t.id}>
                                        <div className="flex flex-col">
                                            <span className="font-bold">{t.nombre}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">
                                                {t.proveedor?.nombre_comercial || 'Sin proveedor'} • {formatCurrency(t.precio_base)}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={selectedHitos.size === 0 || !tipoTransporteId}>Asignar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function EntregaFormPage() {
    const router = useRouter();
    const params = useParams() ?? {};
    const numero_expediente = (params.numero_expediente as string) || '';
    const isEditing = numero_expediente !== 'nuevo';

    const [isMounted, setIsMounted] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showProposalDialog, setShowProposalDialog] = useState(false);
    const { toast } = useToast();

    const [hitos, setHitos] = useState<EntregaHito[]>([]);
    const [transporteOrders, setTransporteOrders] = useState<TransporteOrder[]>([]);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

    // Supabase Hooks
    const { data: currentEntrega, isLoading: loadingEntrega } = useEntrega(isEditing ? numero_expediente : '');
    const { data: pedidosEntregaData } = usePedidosEntrega(isEditing ? numero_expediente : '');
    const { data: transporteData } = useTransporteOrders(isEditing ? numero_expediente : '');
    
    const updateEntrega = useUpdateEntrega();
    const createEntrega = useCreateEntrega();
    const syncTransporteOrders = useSyncTransporteOrders();
    const { data: articulosData } = useArticulos();

    const form = useForm<EntregaFormValues>({
        resolver: zodResolver(entregaFormSchema),
        defaultValues,
    });

    const { control, handleSubmit, formState: { isDirty }, getValues, reset, watch, setValue } = form;

    const tarifa = watch('tarifa');

    const calculateHitoTotal = useCallback((hito: EntregaHito): number => {
        const totalProductos = hito.items.reduce((sum, item) => sum + ((item.pvp || 0) * item.quantity), 0);
        const costePorte = tarifa === 'IFEMA' ? 95 : 30;
        const totalPortes = (hito.portes || 0) * costePorte;
        return totalProductos + totalPortes;
    }, [tarifa]);

    const pvpTotalHitos = useMemo(() => {
        return hitos.reduce((total, hito) => total + calculateHitoTotal(hito), 0);
    }, [hitos, calculateHitoTotal]);

    useEffect(() => {
        if (tarifa === 'IFEMA') {
            setValue('spacePercentage', 17.85, { shouldDirty: true });
        } else if (tarifa === 'Empresa' && getValues('spacePercentage') === 17.85) {
            setValue('spacePercentage', 0, { shouldDirty: true });
        }
    }, [tarifa, setValue, getValues]);

    const agencyPercentage = watch('agencyPercentage');
    const agencyCommissionValue = watch('agencyCommissionValue');
    const spacePercentage = watch('spacePercentage');
    const spaceCommissionValue = watch('spaceCommissionValue');

    useEffect(() => {
        if (isEditing && currentEntrega) {
            const extraData = currentEntrega.data || {};
            reset({
                ...defaultValues,
                ...extraData,
                serviceNumber: currentEntrega.numero_expediente || '',
                client: currentEntrega.nombre_evento || '',
                startDate: currentEntrega.fecha_inicio ? new Date(currentEntrega.fecha_inicio) : undefined,
                endDate: currentEntrega.fecha_fin ? new Date(currentEntrega.fecha_fin) : undefined,
                status: currentEntrega.estado === 'CONFIRMADO' ? 'Confirmado' :
                        currentEntrega.estado === 'CANCELADO' ? 'Anulado' :
                        currentEntrega.estado === 'EJECUTADO' ? 'Entregado' : 'Borrador',
                tarifa: currentEntrega.tarifa === 'IFEMA' ? 'IFEMA' : 'Empresa',
                facturacion: currentEntrega.facturacion || 0,
                comisionesAgencia: currentEntrega.comisiones_agencia || 0,
                comisionesCanon: currentEntrega.comisiones_canon || 0,
            });
            
            // Load hitos from entrega data or fallback to pedidosEntregaData
            if (extraData.hitos) {
                setHitos(extraData.hitos);
            } else {
                const currentPedido = Array.isArray(pedidosEntregaData) 
                    ? pedidosEntregaData.find((p: any) => p.evento_id === numero_expediente || p.evento_id === currentEntrega.id) 
                    : null;
                
                if (currentPedido?.hitos) {
                    setHitos(currentPedido.hitos);
                }
            }

            if (transporteData) {
                setTransporteOrders(transporteData.filter((t: any) => t.osId === numero_expediente || t.osId === currentEntrega.id));
            }
        } else if (!isEditing) {
            reset(defaultValues);
        }

        setIsMounted(true);
    }, [numero_expediente, isEditing, currentEntrega, pedidosEntregaData, transporteData, reset]);

    if (isEditing && loadingEntrega) {
        return <LoadingSkeleton />;
    }

    const handleSaveHito = async (hitoData: EntregaHito) => {
        setHitos(prevHitos => {
            const existingIndex = prevHitos.findIndex(h => h.id === hitoData.id);
            if (existingIndex > -1) {
                const newHitos = [...prevHitos];
                newHitos[existingIndex] = hitoData;
                return newHitos;
            } else {
                return [...prevHitos, hitoData];
            }
        });
        toast({ title: 'Hito guardado localmente (Recuerda guardar el pedido)' });
    }

    const handleDeleteHito = (index: number) => {
        const hitoIdToDelete = hitos[index].id;
        const newHitos = hitos.filter((_, i) => i !== index);
        setHitos(newHitos);

        // Also remove associated transport orders from local state
        setTransporteOrders(prev => prev.filter(t => !t.hitosIds?.includes(hitoIdToDelete)));
        toast({ title: 'Hito eliminado localmente' });
    }

    async function onSubmit(data: EntregaFormValues) {
        setIsLoading(true);
        try {
            // Recalculate commissions just before saving
            const agencyDiscount = pvpTotalHitos * ((data.agencyPercentage || 0) / 100);
            const spaceDiscount = pvpTotalHitos * ((data.spacePercentage || 0) / 100);
            const comisionAgenciaTotal = agencyDiscount + (data.agencyCommissionValue || 0);
            const comisionCanonTotal = spaceDiscount + (data.spaceCommissionValue || 0);

            const entregaData: any = {
                numero_expediente: data.serviceNumber,
                nombre_evento: data.client || 'Pedido de Entrega',
                fecha_inicio: data.startDate ? (data.startDate as Date).toISOString() : new Date().toISOString(),
                fecha_fin: data.endDate ? (data.endDate as Date).toISOString() : new Date().toISOString(),
                estado: (data.status === 'Confirmado' ? 'CONFIRMADO' : 
                         data.status === 'Anulado' ? 'CANCELADO' : 
                         (data.status === 'Enviado' || data.status === 'Entregado') ? 'EJECUTADO' : 'BORRADOR'),
                vertical: 'Entregas',
                facturacion: pvpTotalHitos,
                comisiones_agencia: comisionAgenciaTotal,
                comisiones_canon: comisionCanonTotal,
                tarifa: data.tarifa === 'IFEMA' ? 'IFEMA' : 'NORMAL',
                data: {
                    asistentes: data.asistentes,
                    contact: data.contact,
                    phone: data.phone,
                    email: data.email,
                    finalClient: data.finalClient,
                    tipoCliente: data.tipoCliente,
                    comercial: data.comercial,
                    agencyPercentage: data.agencyPercentage,
                    agencyCommissionValue: data.agencyCommissionValue,
                    spacePercentage: data.spacePercentage,
                    spaceCommissionValue: data.spaceCommissionValue,
                    plane: data.plane,
                    comments: data.comments,
                    deliveryLocations: data.deliveryLocations,
                    direccionPrincipal: data.direccionPrincipal,
                    deliveryTime: hitos?.[0]?.hora || '',
                    hitos: hitos, // Store hitos here
                }
            };

            let currentId = numero_expediente;
            if (isEditing) {
                const targetId = currentEntrega?.id || numero_expediente;
                await updateEntrega.mutateAsync({ id: targetId, ...entregaData });
                currentId = targetId;
                toast({ description: 'Pedido de entrega actualizado.' });
            } else {
                const newEntrega = await createEntrega.mutateAsync(entregaData);
                currentId = newEntrega.id;
                toast({ description: 'Pedido de entrega creado.' });
            }

            // Sync Transporte
            await syncTransporteOrders.mutateAsync({ osId: currentId, orders: transporteOrders });

            if (!isEditing) {
                router.push(`/entregas/pedido/${data.serviceNumber}`);
            } else {
                form.reset(getValues()); // Mark form as not dirty
            }
        } catch (error) {
            console.error('Error saving delivery:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el pedido.' });
        } finally {
            setIsLoading(false);
        }
    }

    const handleDelete = async () => {
        if (!isEditing) return;
        // Note: In a real app, we'd have a useDeleteEntrega hook. 
        // For now, let's assume we just need to remove it from the list view.
        // If there's no delete hook, we might need to add it to use-data-queries.
        toast({ title: 'Funcionalidad de eliminación pendiente de implementar en Supabase' });
    };


    const handleSaveTransporte = (order: Omit<TransporteOrder, 'id'>) => {
        const newOrder: TransporteOrder = { ...order, id: crypto.randomUUID() };
        setTransporteOrders(prev => [...prev, newOrder]);
        toast({ title: 'Transporte Asignado (Recuerda guardar para confirmar)' });
    }

    const handlePrintProposal = async (lang: 'es' | 'en') => {
        const osData = form.getValues() as Partial<Entrega>;
        if (!osData) return;

        setIsPrinting(true);
        try {
            // Dynamic imports to reduce initial bundle size and avoid blocking main thread on load
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const articulos = (articulosData || []) as any[];
            const productosMap = new Map(articulos.map(p => [p.id, p]));

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const margin = 15;
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            let finalY = margin;

            // --- TEXTOS ---
            const texts = {
                es: { proposalTitle: 'Propuesta Comercial', orderNumber: 'Nº Pedido:', issueDate: 'Fecha Emisión:', client: 'Cliente:', finalClient: 'Cliente Final:', contact: 'Contacto:', eventDate: 'Fecha Principal:', deliveryFor: 'Entrega para:', logistics: 'Logística:', item: 'Producto', qty: 'Cant.', unitPrice: 'P. Unitario', subtotal: 'Subtotal', deliveryTotal: 'Total Entrega', summaryTitle: 'Resumen Económico', productsSubtotal: 'Subtotal Productos', logisticsSubtotal: 'Subtotal Logística', taxableBase: 'Base Imponible', vat: 'IVA', total: 'TOTAL Propuesta', observations: 'Observaciones', footer: 'MICE Catering - Propuesta generada digitalmente.', portes: 'portes', porte: 'porte' },
                en: { proposalTitle: 'Commercial Proposal', orderNumber: 'Order No.:', issueDate: 'Issue Date:', client: 'Client:', finalClient: 'End Client:', contact: 'Contact:', eventDate: 'Main Date:', deliveryFor: 'Delivery for:', logistics: 'Logistics:', item: 'Product', qty: 'Qty.', unitPrice: 'Unit Price', subtotal: 'Subtotal', deliveryTotal: 'Total Delivery', summaryTitle: 'Financial Summary', productsSubtotal: 'Products Subtotal', logisticsSubtotal: 'Logistics Subtotal', taxableBase: 'Taxable Base', vat: 'VAT', total: 'TOTAL Proposal', observations: 'Observations', footer: 'MICE Catering - Digitally generated proposal.', portes: 'deliveries', porte: 'delivery' }
            };
            const T = texts[lang];

            // --- CABECERA ---
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#f97316'); // Orange
            doc.text(T.proposalTitle, margin, finalY);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#374151');
            doc.text(`${T.orderNumber} ${osData.serviceNumber}`, pageWidth - margin, finalY - 5, { align: 'right' });
            doc.text(`${T.issueDate} ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, finalY, { align: 'right' });
            finalY += 15;

            // --- INFO CLIENTE ---
            const clientInfo: (string | undefined)[][] = [
                [T.client, osData.client ?? ''],
                [T.finalClient, osData.finalClient ?? '-'],
                [T.contact, `${osData.contact ?? ''} ${osData.phone ? `(${osData.phone})` : ''}`],
                [T.eventDate, (osData as any).startDate ? format(new Date((osData as any).startDate), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')]
            ];
            autoTable(doc, {
                body: clientInfo as any,
                startY: finalY,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 0.5 },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;

            // --- DESGLOSE POR HITOS ---
            let totalLogisticsCost = 0;

            for (const hito of hitos) {
                const hitoTotal = calculateHitoTotal(hito);
                const costePorte = osData.tarifa === 'IFEMA' ? 95 : 30;
                const portesHito = (hito.portes || 0) * costePorte;
                totalLogisticsCost += portesHito;

                if (finalY + 40 > pageHeight) { doc.addPage(); finalY = margin; }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor('#1f2937');
                doc.text(`${T.deliveryFor} ${hito.lugarEntrega}`, margin, finalY);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor('#6b7280');
                doc.text(`${format(new Date(hito.fecha), 'dd/MM/yy')} - ${hito.hora}`, margin, finalY + 5);
                finalY += 12;

                const body = hito.items.map(item => {
                    const producto = productosMap.get(item.id);
                    const nombre = lang === 'en' && producto?.nombre_en ? producto.nombre_en : item.nombre;
                    return [
                        nombre,
                        item.quantity,
                        formatCurrency(item.pvp),
                        formatCurrency(item.pvp * item.quantity)
                    ]
                });



                if (hito.portes && hito.portes > 0) {
                    (body as any[]).push([
                        { content: `${T.logistics} (${hito.portes} ${hito.portes! > 1 ? T.portes : T.porte})`, styles: { fontStyle: 'bold' } },
                        '',
                        formatCurrency(costePorte),
                        formatCurrency(portesHito)
                    ]);
                }
                autoTable(doc, {
                    head: [[T.item, T.qty, T.unitPrice, T.subtotal]],
                    body: body,
                    startY: finalY,
                    theme: 'grid',
                    headStyles: { fillColor: '#f3f4f6', textColor: '#374151', fontStyle: 'bold' },
                    styles: { fontSize: 8 },
                    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
                });
                finalY = (doc as any).lastAutoTable.finalY + 5;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`${T.deliveryTotal}: ${formatCurrency(hitoTotal)}`, pageWidth - margin, finalY, { align: 'right' });
                finalY += 15;
            }

            // --- RESUMEN FINAL ---
            if (finalY + 45 > pageHeight) { doc.addPage(); finalY = margin; }

            const totalProductos = pvpTotalHitos - totalLogisticsCost;
            const baseImponible = pvpTotalHitos;
            const iva = baseImponible * 0.10; // Asumiendo 10% para simplificar
            const totalFinal = baseImponible + iva;

            const summaryData = [
                [T.productsSubtotal, formatCurrency(totalProductos)],
                [T.logisticsSubtotal, formatCurrency(totalLogisticsCost)],
                [{ content: T.taxableBase, styles: { fontStyle: 'bold' as 'bold' } }, { content: formatCurrency(baseImponible), styles: { fontStyle: 'bold' as 'bold' } }],
                [`${T.vat} (10%)`, formatCurrency(iva)],
                [{ content: T.total, styles: { fontStyle: 'bold' as 'bold', fontSize: 12, textColor: '#f97316' } }, { content: formatCurrency(totalFinal), styles: { fontStyle: 'bold' as 'bold', fontSize: 12, textColor: '#f97316' } }]
            ];

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#1f2937');
            doc.text(T.summaryTitle, margin, finalY);
            finalY += 8;

            autoTable(doc, {
                body: summaryData,
                startY: finalY,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 1 },
                columnStyles: { 1: { halign: 'right' } }
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;

            // --- FOOTER ---
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor('#6b7280');
                doc.text(`${T.footer} - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }


            doc.save(`Propuesta_${osData.serviceNumber}.pdf`);

        } catch (error) {
            console.error("Error al generar el PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la propuesta en PDF.' });
        } finally {
            setIsPrinting(false);
        }
    };


    if (!isMounted) {
        return <LoadingSkeleton title={isEditing ? 'Editando Pedido...' : 'Nuevo Pedido...'} />;
    }

    return (
        <main className="min-h-screen bg-background">
            {/* Premium Sticky Header */}
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Package className="h-5 w-5 text-amber-500" />
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => router.push('/entregas/pes')}>
                            <X className="mr-2 h-3 w-3" /> Cancelar
                        </Button>
                        {isEditing && (
                            <>
                                <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider">
                                            <Printer className="mr-2 h-3 w-3" /> Propuesta
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle className="text-sm font-black uppercase tracking-widest">Generar Propuesta Comercial</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-6 text-center">
                                            <p className="text-xs text-muted-foreground mb-6 uppercase tracking-wider font-medium">Selecciona el idioma para la propuesta:</p>
                                            <div className="flex justify-center gap-4">
                                                <Button 
                                                    className="bg-amber-500 hover:bg-amber-600 text-white h-10 px-6 text-[10px] font-bold uppercase tracking-widest"
                                                    onClick={() => { handlePrintProposal('es'); setShowProposalDialog(false); }} 
                                                    disabled={isPrinting}
                                                >
                                                    {isPrinting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Español'}
                                                </Button>
                                                <Button 
                                                    variant="outline"
                                                    className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest"
                                                    onClick={() => { handlePrintProposal('en'); setShowProposalDialog(false); }} 
                                                    disabled={isPrinting}
                                                >
                                                    {isPrinting ? <Loader2 className="animate-spin h-4 w-4" /> : 'English'}
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)}>
                                    <Trash2 className="mr-2 h-3 w-3" /> Borrar
                                </Button>
                            </>
                        )}
                        <Button 
                            type="submit" 
                            form="entrega-form" 
                            disabled={isLoading}
                            size="sm"
                            className="h-8 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider"
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <Save className="mr-2 h-3 w-3" />}
                            {isEditing ? 'Guardar Cambios' : 'Guardar Pedido'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-12">
                <FormProvider {...form}>
                    <form id="entrega-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <Card className="border-border/40 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/30 py-3 border-b border-border/40">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5 text-amber-500" />
                                    Información General del Pedido
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                                    <FormField control={control} name="serviceNumber" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nº Pedido</FormLabel>
                                            <FormControl><Input {...field} readOnly={isEditing} className="h-9 text-xs font-medium bg-muted/20" /></FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={control} name="startDate" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fecha Principal</FormLabel>
                                            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant={"outline"} className={cn("pl-3 text-left font-medium h-9 text-xs", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setStartDateOpen(false); }} initialFocus locale={es} />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="asistentes" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nº Asistentes</FormLabel>
                                            <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-9 text-xs font-medium" /></FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="tarifa" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tarifa</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-9 text-xs font-medium"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Empresa" className="text-xs">Empresa</SelectItem>
                                                    <SelectItem value="IFEMA" className="text-xs">IFEMA</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estado</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className={cn(
                                                        "h-9 text-xs font-bold uppercase tracking-wider",
                                                        getValues('status') === 'Confirmado' && 'bg-green-500/10 text-green-600 border-green-500/20',
                                                        getValues('status') === 'Pendiente' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                                        getValues('status') === 'Borrador' && 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Borrador" className="text-xs font-bold uppercase tracking-wider">Borrador</SelectItem>
                                                    <SelectItem value="Confirmado" className="text-xs font-bold uppercase tracking-wider">Confirmado</SelectItem>
                                                    <SelectItem value="Enviado" className="text-xs font-bold uppercase tracking-wider">Enviado</SelectItem>
                                                    <SelectItem value="Entregado" className="text-xs font-bold uppercase tracking-wider">Entregado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>

                                <Accordion type="single" defaultValue="cliente-info" collapsible className="w-full space-y-4 mt-8">
                                    <AccordionItem value="cliente-info" className="border border-border/40 rounded-xl overflow-hidden px-0">
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                                            <ClienteTitle />
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-4">
                                            <ClientInfo />
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="financial-info" className="border border-border/40 rounded-xl overflow-hidden px-0">
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                                            <FinancialTitle pvpBruto={pvpTotalHitos} />
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-4">
                                            <div className="pt-4 space-y-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <FormField control={control} name="agencyPercentage" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comisión Agencia (%)</FormLabel>
                                                            <FormControl><Input type="number" {...field} className="h-9 text-xs font-medium" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={control} name="agencyCommissionValue" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comisión Agencia (€)</FormLabel>
                                                            <FormControl><Input type="number" {...field} className="h-9 text-xs font-medium" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={control} name="spacePercentage" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Canon Espacio (%)</FormLabel>
                                                            <FormControl><Input type="number" {...field} className="h-9 text-xs font-medium" readOnly={tarifa === 'IFEMA'} /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={control} name="spaceCommissionValue" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Canon Espacio (€)</FormLabel>
                                                            <FormControl><Input type="number" {...field} className="h-9 text-xs font-medium" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </form>
                </FormProvider>

                {isEditing && (
                    <div className="grid lg:grid-cols-2 gap-6 mt-6">
                        <Card className="border-border/40 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/30 py-3 border-b border-border/40 flex-row justify-between items-center">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5 text-amber-500" />
                                    Entregas del Pedido
                                </CardTitle>
                                <HitoDialog onSave={handleSaveHito} os={getValues()}>
                                    <Button size="sm" className="h-7 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider">
                                        <PlusCircle className="mr-2 h-3 w-3" />
                                        Añadir Entrega
                                    </Button>
                                </HitoDialog>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {hitos.map((hito, index) => (
                                    <div key={hito.id} className="group relative bg-background border border-border/40 rounded-xl p-4 hover:border-amber-500/50 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-widest">
                                                        {`${getValues('serviceNumber') || 'Pedido'}.${(index + 1).toString().padStart(2, '0')}`}
                                                    </span>
                                                    <h3 className="text-xs font-bold uppercase tracking-tight">{hito.lugarEntrega}</h3>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                                                    <CalendarIcon className="h-3 w-3" />
                                                    {format(new Date(hito.fecha), "PPP", { locale: es })} - {hito.hora}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{hito.localizacion}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-amber-600 mb-2">
                                                    {formatCurrency(calculateHitoTotal(hito))}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button asChild size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800">
                                                        <Link href={`/entregas/entrega/${hito.id}?osId=${numero_expediente}`}>
                                                            Confeccionar
                                                        </Link>
                                                    </Button>
                                                    <HitoDialog onSave={handleSaveHito} initialData={hito} os={getValues()}>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-amber-500/10 hover:text-amber-600">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </HitoDialog>
                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteHito(index) }}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {hitos.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/40 rounded-xl bg-muted/10">
                                        <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No hay entregas definidas</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/30 py-3 border-b border-border/40 flex-row justify-between items-center">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Truck className="h-3.5 w-3.5 text-amber-500" />
                                    Gestión de Transporte
                                </CardTitle>
                                <TransporteDialog onSave={handleSaveTransporte} osId={numero_expediente} hitos={hitos} existingTransportOrders={transporteOrders} />
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/20">
                                        <TableRow className="hover:bg-transparent border-b border-border/40">
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Entrega(s)</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Proveedor</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 text-right">Coste</TableHead>
                                            <TableHead className="h-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transporteOrders.length > 0 ? transporteOrders.map(t => (
                                            <TableRow key={t.id} className="hover:bg-muted/10 border-b border-border/40 transition-colors">
                                                <TableCell className="py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(t.hitosIds || []).map(hId => {
                                                            const hito = hitos.find(h => h.id === hId);
                                                            return (
                                                                <Badge key={hId} variant="outline" className="text-[9px] font-bold uppercase tracking-tighter bg-amber-500/5 border-amber-500/20 text-amber-700">
                                                                    {hito?.lugarEntrega}
                                                                </Badge>
                                                            )
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <span className="text-[11px] font-bold uppercase tracking-tight">{t.proveedorNombre}</span>
                                                </TableCell>
                                                <TableCell className="py-3 text-right">
                                                    <span className="text-[11px] font-black text-amber-600">{formatCurrency(t.precio)}</span>
                                                </TableCell>
                                                <TableCell className="py-3 text-right">
                                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/10 hover:text-amber-600">
                                                        Ver
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-12">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Truck className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No hay transportes asignados</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent className="border-border/40 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-sm font-black uppercase tracking-widest">¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs uppercase tracking-wider font-medium">
                            Esta acción es irreversible. Se eliminará permanentemente el pedido de entrega y todos sus datos asociados (confección, transportes, etc.).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="h-8 text-[10px] font-bold uppercase tracking-wider">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="h-8 bg-destructive hover:bg-destructive/90 text-[10px] font-bold uppercase tracking-wider">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}

