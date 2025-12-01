

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { OrdenFabricacion, Personal, Elaboracion, ComponenteElaboracion, IngredienteInterno, ArticuloERP, ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder, Receta } from '@/types';
import { ArrowLeft, Save, Factory, Info, Check, X, AlertTriangle, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { formatNumber, formatUnit } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'Asignada': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};

type DetalleNecesidad = {
    osId: string;
    osNumber: string;
    osSpace: string;
    hitoId: string;
    hitoDescripcion: string;
    fechaHito: string;
    recetaId: string;
    recetaNombre: string;
    cantidadReceta: number;
    cantidadNecesaria: number;
}

type DesgloseProduccionItem = {
    id: string; // combination of osId-hitoId-recetaId
    cantidadReal: number | null;
    check: boolean;
};

type FormData = {
    elaboracionId: string;
    cantidadTotal: number;
    fechaProduccionPrevista: Date;
    responsable?: string;
    cantidadReal: number | null;
    incidenciaObservaciones?: string;
    desgloseProduccion: DesgloseProduccionItem[];
}

type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export default function OfDetailPage() {
    const [orden, setOrden] = useState<OrdenFabricacion | null>(null);
    const [elaboracion, setElaboracion] = useState<Elaboracion | null>(null);
    const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
    const [dbElaboraciones, setDbElaboraciones] = useState<Elaboracion[]>([]);
    const [ingredientesData, setIngredientesData] = useState<Map<string, IngredienteConERP>>(new Map());
    const [detallesNecesidad, setDetallesNecesidad] = useState<DetalleNecesidad[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const id = params.id as string;
    const isEditing = id !== 'nuevo';
    
    const form = useForm<FormData>({
        defaultValues: {
            responsable: '',
            cantidadReal: null,
            incidenciaObservaciones: '',
            fechaProduccionPrevista: new Date(),
            desgloseProduccion: []
        }
    });
    
    const { control, watch, setValue, getValues } = form;
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "desgloseProduccion"
    });

    const watchedElaboracionId = watch('elaboracionId');
    const desgloseWatch = watch('desgloseProduccion');

    const isDesgloseComplete = useMemo(() => {
        if (!desgloseWatch || desgloseWatch.length === 0) return false;
        return desgloseWatch.every(item => item.cantidadReal !== null && item.cantidadReal >= 0 && item.check);
    }, [desgloseWatch]);

    const totalDesglose = useMemo(() => {
        return desgloseWatch?.reduce((sum, item) => sum + (item.cantidadReal || 0), 0) || 0;
    }, [desgloseWatch]);
    
    useEffect(() => {
      setValue('cantidadReal', totalDesglose);
    }, [totalDesglose, setValue]);

    const selectedElaboracion = useMemo(() => dbElaboraciones.find(e => e.id === watchedElaboracionId), [dbElaboraciones, watchedElaboracionId]);

    const loadNecesidades = useCallback((of: OrdenFabricacion | null) => {
        if (!of) return;
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];

        const necesidades: DetalleNecesidad[] = [];
        
        for (const osId of of.osIDs) {
            const os = allServiceOrders.find(o => o.id === osId);
            if (!os) continue;

            const briefing = allBriefings.find(b => b.osId === osId);
            if (!briefing) continue;
            
            const gastroOrders = allGastroOrders.filter(g => g.osId === osId);

            for (const gastroOrder of gastroOrders) {
                const hito = briefing.items.find(i => i.id === gastroOrder.id);
                if (!hito) continue;

                for (const item of (gastroOrder.items || [])) {
                    if (item.type === 'item') {
                        const receta = allRecetas.find(r => r.id === item.id);
                        if (receta) {
                            const elabEnReceta = receta.elaboraciones.find(e => e.elaboracionId === of.elaboracionId);
                            if (elabEnReceta) {
                                necesidades.push({
                                    osId: os.id,
                                    osNumber: os.serviceNumber,
                                    osSpace: os.space,
                                    hitoId: hito.id,
                                    hitoDescripcion: hito.descripcion,
                                    fechaHito: hito.fecha,
                                    recetaId: receta.id,
                                    recetaNombre: receta.nombre,
                                    cantidadReceta: item.quantity || 0,
                                    cantidadNecesaria: (item.quantity || 0) * elabEnReceta.cantidad
                                });
                            }
                        }
                    }
                }
            }
        }
        setDetallesNecesidad(necesidades);
        // Initialize desgloseProduccion in the form
        const initialDesglose = necesidades.map(n => ({
            id: `${n.osId}-${n.hitoId}-${n.recetaId}`,
            cantidadReal: null,
            check: false
        }));
        setValue('desgloseProduccion', initialDesglose);
        
    }, [setValue]);


    useEffect(() => {
        const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));

        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        setDbElaboraciones(allElaboraciones);
        
        const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
        const combined = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
        setIngredientesData(new Map(combined.map(i => [i.id, i])));
        
        if (isEditing) {
            const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
            const currentOF = allOFs.find(of => of.id === id);
            setOrden(currentOF || null);
            
            if (currentOF) {
                form.reset({
                    elaboracionId: currentOF.elaboracionId,
                    cantidadTotal: currentOF.cantidadTotal,
                    fechaProduccionPrevista: new Date(currentOF.fechaProduccionPrevista),
                    responsable: currentOF.responsable,
                    cantidadReal: currentOF.cantidadReal ?? null,
                    incidenciaObservaciones: currentOF.incidenciaObservaciones || '',
                    desgloseProduccion: [],
                });
                const elabData = allElaboraciones.find(e => e.id === currentOF.elaboracionId);
                setElaboracion(elabData || null);
                loadNecesidades(currentOF);
            }
        }
    }, [id, form, isEditing, loadNecesidades]);

    const ratioProduccion = useMemo(() => {
        if (!isEditing || !orden || !elaboracion || !elaboracion.produccionTotal) return 1;
        return orden.cantidadTotal / elaboracion.produccionTotal;
    }, [orden, elaboracion, isEditing]);
    
    const handleSave = (newStatus?: OrdenFabricacion['estado'], newResponsable?: string) => {
        if (!isEditing || !orden) return;

        const formData = getValues();
        let updatedOF: OrdenFabricacion = { ...orden };

        if (newStatus) {
            updatedOF.estado = newStatus;
            if (newStatus === 'Asignada' && newResponsable) {
                updatedOF.responsable = newResponsable;
                updatedOF.fechaAsignacion = new Date().toISOString();
            }
            if (newStatus === 'En Proceso') {
                if (!updatedOF.responsable) updatedOF.responsable = formData.responsable || 'Sin asignar';
                updatedOF.fechaInicioProduccion = new Date().toISOString();
            }
            if (newStatus === 'Finalizado') {
                updatedOF.cantidadReal = formData.cantidadReal || updatedOF.cantidadTotal;
                updatedOF.fechaFinalizacion = new Date().toISOString();
            }
            if (newStatus === 'Incidencia') {
                updatedOF.incidenciaObservaciones = formData.incidenciaObservaciones;
            }
        } else { // Generic save
             updatedOF = {
                ...orden,
                responsable: formData.responsable,
                cantidadReal: formData.cantidadReal,
                incidenciaObservaciones: formData.incidenciaObservaciones,
             };
        }

        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === orden.id);
        if (index !== -1) {
            allOFs[index] = updatedOF;
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            setOrden(updatedOF);
            form.reset({ ...getValues(), responsable: updatedOF.responsable, cantidadReal: updatedOF.cantidadReal, incidenciaObservaciones: updatedOF.incidenciaObservaciones || '' });
            toast({ title: 'Guardado', description: `La Orden de Fabricación ha sido actualizada.` });
        }
    };

    const handleCreate = (data: FormData) => {
        if (!selectedElaboracion) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar una elaboración.' });
            return;
        }

        const allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const lastIdNumber = allOFs.reduce((max, of) => {
            const numPart = of.id.split('-')[2];
            const num = numPart ? parseInt(numPart) : 0;
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);

        const newOF: OrdenFabricacion = {
            id: `OF-${new Date().getFullYear()}-${(lastIdNumber + 1).toString().padStart(3, '0')}`,
            fechaCreacion: new Date().toISOString(),
            fechaProduccionPrevista: data.fechaProduccionPrevista.toISOString(),
            elaboracionId: selectedElaboracion.id,
            elaboracionNombre: selectedElaboracion.nombre,
            cantidadTotal: data.cantidadTotal,
            unidad: selectedElaboracion.unidadProduccion,
            partidaAsignada: selectedElaboracion.partidaProduccion,
            tipoExpedicion: selectedElaboracion.tipoExpedicion,
            estado: 'Pendiente',
            osIDs: [],
            incidencia: false,
            okCalidad: false,
        };
        
        allOFs.push(newOF);
        localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
        toast({ title: 'OF Manual Creada', description: `Se ha creado la Orden de Fabricación ${newOF.id}.`});
        router.push('/cpr/of');
    }
    
    const handleDelete = () => {
        if (!orden) return;
        let allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const updatedOFs = allOFs.filter(of => of.id !== orden.id);
        localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));
        toast({ title: 'Orden Eliminada', description: `La OF ${orden.id} ha sido eliminada.`});
        router.push('/cpr/of');
    }


