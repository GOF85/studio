
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ListChecks, Calendar as CalendarIcon, User, Building, AlertTriangle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { PickingSheet, OrderItem } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type PickingItemState = {
    itemCode: string;
    checked: boolean;
    pickedQuantity: number;
    incidentComment?: string;
}

export default function PickingSheetPage() {
    const [sheet, setSheet] = useState<PickingSheet | null>(null);
    const [itemStates, setItemStates] = useState<Map<string, PickingItemState>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const osId = params.id as string;
    const fecha = searchParams.get('fecha');
    const { toast } = useToast();

    const sheetId = `${osId}-${fecha}`;

    const loadSheet = useCallback(() => {
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;
        const currentSheet = allSheets[sheetId];
        
        if (currentSheet) {
            setSheet(currentSheet);
            const initialStates = new Map<string, PickingItemState>();
            currentSheet.items.forEach(item => {
                const savedState = currentSheet.itemStates?.[item.itemCode];
                initialStates.set(item.itemCode, {
                    itemCode: item.itemCode,
                    checked: savedState?.checked || false,
                    pickedQuantity: savedState?.pickedQuantity ?? item.quantity,
                    incidentComment: savedState?.incidentComment,
                });
            });
            setItemStates(initialStates);
        } else {
            toast({ variant: "destructive", title: "Error", description: "Hoja de picking no encontrada."});
            router.push('/almacen/picking');
        }
        setIsMounted(true);
    }, [sheetId, router, toast]);

    useEffect(() => {
        loadSheet();
    }, [loadSheet]);
    
    const saveProgress = useCallback((newStates: Map<string, PickingItemState>) => {
        if(!sheet) return;
        
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}');
        const itemStatesForStorage: Record<string, Omit<PickingItemState, 'itemCode'>> = {};
        newStates.forEach((value, key) => {
            itemStatesForStorage[key] = {
                checked: value.checked,
                pickedQuantity: value.pickedQuantity,
                incidentComment: value.incidentComment,
            };
        });

        const updatedSheet: PickingSheet = {
            ...sheet,
            itemStates: itemStatesForStorage,
        };
        allSheets[sheetId] = updatedSheet;
        localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
        
    }, [sheet, sheetId]);

    const updateItemState = (itemCode: string, updates: Partial<Omit<PickingItemState, 'itemCode'>>) => {
        setItemStates(prevStates => {
            const newStates = new Map(prevStates);
            const currentState = newStates.get(itemCode);
            if (currentState) {
                const newState = { ...currentState, ...updates };
                newStates.set(itemCode, newState);
                saveProgress(newStates);
                return newStates;
            }
            return prevStates;
        });
    }
    
    const { progress, totalItems, checkedCount } = useMemo(() => {
        if (!sheet) return { progress: 0, totalItems: 0, checkedCount: 0 };
        const total = sheet.items.length;
        const checked = Array.from(itemStates.values()).filter(s => s.checked).length;
        return {
            progress: total > 0 ? (checked / total) * 100 : 0,
            totalItems: total,
            checkedCount: checked,
        };
    }, [sheet, itemStates]);

    const groupedItems = useMemo(() => {
        if (!sheet) return {};
        return sheet.items.reduce((acc, item) => {
            const group = item.type || 'Varios';
            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
            return acc;
        }, {} as Record<string, OrderItem[]>);
    }, [sheet]);


    if (!isMounted || !sheet) {
        return <LoadingSkeleton title="Cargando Hoja de Picking..." />;
    }

    return (
        <TooltipProvider>
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/almacen/picking')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <ListChecks /> Hoja de Picking
                    </h1>
                </div>
            </div>
            
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle>Servicio: {sheet.os?.serviceNumber}</CardTitle>
                             <CardDescription>
                                {sheet.os?.client} {sheet.os?.finalClient && `- ${sheet.os.finalClient}`}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-base">{format(new Date(sheet.fechaNecesidad), 'PPP', { locale: es })}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2"><Building className="h-4 w-4"/> <strong>Espacio:</strong> {sheet.os?.space || '-'}</div>
                    <div className="flex items-center gap-2"><User className="h-4 w-4"/> <strong>Contacto:</strong> {sheet.os?.contact || '-'}</div>
                    <div className="flex items-center gap-2"><User className="h-4 w-4"/> <strong>Metre:</strong> {sheet.os?.respMetre || '-'}</div>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">Progreso del Picking</CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={progress} className="w-full h-4" />
                    <p className="text-sm text-muted-foreground mt-2 text-center">{checkedCount} de {totalItems} tipos de artículo recogidos ({progress.toFixed(0)}%)</p>
                </CardContent>
            </Card>

            <div className="space-y-4">
            {Object.entries(groupedItems).map(([type, items]) => (
                <Card key={type}>
                    <CardHeader><CardTitle>{type}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {items.map(item => {
                            const state = itemStates.get(item.itemCode);
                            if (!state) return null;
                            const hasIncident = !!state.incidentComment || state.pickedQuantity !== item.quantity;

                            return (
                                <div key={item.itemCode} className={cn(
                                    "flex items-center gap-4 p-3 border rounded-md transition-colors", 
                                    state.checked ? "bg-green-50" : "bg-background",
                                    hasIncident && !state.checked && "bg-amber-50 border-amber-200"
                                )}>
                                    <Checkbox 
                                        id={`item-${item.itemCode}`}
                                        className="h-8 w-8"
                                        checked={state.checked}
                                        onCheckedChange={(checked) => updateItemState(item.itemCode, { checked: Boolean(checked) })}
                                    />
                                    <Label htmlFor={`item-${item.itemCode}`} className="flex-grow cursor-pointer">
                                        <p className="font-bold text-lg">{item.description}</p>
                                        <p className="text-sm text-muted-foreground">Código: {item.itemCode} | Cant. Requerida: {item.quantity}</p>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`qty-${item.itemCode}`} className="text-sm font-medium">Cant. Recogida:</Label>
                                        <Input
                                            id={`qty-${item.itemCode}`}
                                            type="number"
                                            value={state.pickedQuantity}
                                            onChange={(e) => updateItemState(item.itemCode, { pickedQuantity: parseInt(e.target.value, 10) || 0 })}
                                            className="w-20 text-center h-9"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {state.incidentComment && (
                                            <Tooltip>
                                                <TooltipTrigger><MessageSquare className="h-5 w-5 text-amber-600" /></TooltipTrigger>
                                                <TooltipContent><p>{state.incidentComment}</p></TooltipContent>
                                            </Tooltip>
                                        )}
                                         <Dialog>
                                            <DialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-600 hover:bg-amber-100 hover:text-amber-700">
                                                    <AlertTriangle className="h-5 w-5"/>
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Registrar Incidencia: {item.description}</DialogTitle>
                                                    <DialogDescription>
                                                        Describe el problema encontrado. La cantidad recogida ya se ha ajustado a {state.pickedQuantity}.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <Textarea 
                                                    id={`comment-${item.itemCode}`}
                                                    defaultValue={state.incidentComment}
                                                    placeholder="Ej: Solo se encontraron 22 unidades en la estantería P4-E2."
                                                    rows={4}
                                                    onBlur={(e) => updateItemState(item.itemCode, { incidentComment: e.target.value })}
                                                />
                                                 <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button>Cerrar</Button>
                                                    </DialogClose>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            ))}
            </div>
        </div>
        </TooltipProvider>
    );
}

```
  </change>
  <change>
    <file>src/types/index.ts</file>
    <content><![CDATA[

import { z } from "zod";

export type CateringItem = {
  itemCode: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  imageHint: string;
  category: string;
};

export type OrderItem = CateringItem & {
  quantity: number;
};

export type OrderCompletionAssistantInput = {
  eventDescription: string;
};

export type OrderCompletionAssistantOutput = {
  itemCode: string;
  description: string;
  price: number;
  quantity: number;
}[];


export type ServiceOrder = {
    id: string;
    serviceNumber: string;
    startDate: string;
    endDate: string;
    client: string;
    tipoCliente?: 'Empresa' | 'Agencia' | 'Particular';
    finalClient: string;
    contact: string;
    phone: string;
    asistentes: number;
    space: string;
    spaceAddress: string;
    spaceContact: string;
    spacePhone: string;
    spaceMail: string;
    respMetre: string;
    respMetrePhone: string;
    respMetreMail: string;
    respCocinaCPR: string;
    respCocinaCPRPhone: string;
    respCocinaCPRMail: string;
    respPase: string;
    respPasePhone: string;
    respPaseMail: string;
    respCocinaPase: string;
    respCocinaPasePhone: string;
    respCocinaPaseMail: string;
    comercialAsiste: boolean;
    comercial: string;
    comercialPhone: string;
    comercialMail: string;
    rrhhAsiste: boolean;
    respRRHH: string;
    respRRHHPhone: string;
    respRRHHMail: string;
    agencyPercentage: number;
    agencyCommissionValue?: number;
    spacePercentage: number;
    spaceCommissionValue?: number;
    comisionesAgencia?: number;
    comisionesCanon?: number;
    facturacion: number;
    plane: string;
    comments: string;
    status: 'Borrador' | 'Pendiente' | 'Confirmado' | 'Anulado';
    anulacionMotivo?: string;
    deliveryTime?: string;
    deliveryLocations?: string[];
    objetivoGastoId?: string;
    vertical?: 'Catering' | 'Entregas';
    direccionPrincipal?: string;
    isVip?: boolean;
};

export type MaterialOrder = {
    id: string;
    osId: string;
    type: 'Almacén' | 'Bodega' | 'Bio' | 'Alquiler';
    status: 'Asignado' | 'En preparación' | 'Listo';
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
};


export type Personal = {
    id: string;
    nombre: string;
    departamento: string;
    categoria: string;
    telefono: string;
    mail: string;
    dni: string;
    precioHora: number;
}

export type Espacio = {
    id: string;
    espacio: string;
    escaparateMICE: string;
    carpetaDRIVE: string;
    calle: string;
    nombreContacto1: string;
    telefonoContacto1: string;
    emailContacto1: string;
    canonEspacioPorcentaje: number;
    canonEspacioFijo: number;
    canonMcPorcentaje: number;
    canonMcFijo: number;
    comisionAlquilerMcPorcentaje: number;
    precioOrientativoAlquiler: string;
    horaLimiteCierre: string;
    aforoCocktail: number;
    aforoBanquete: number;
    auditorio: string;
    aforoAuditorio: number;
    zonaExterior: string;
    capacidadesPorSala: string;
    numeroDeSalas: number;
    tipoDeEspacio: string;
    tipoDeEventos: string;
    ciudad: string;
    directorio: string;
    descripcion: string;
    comentariosVarios: string;
    equipoAudiovisuales: string;
    cocina: string;
    accesibilidadAsistentes: string;
    pantalla: string;
    plato: string;
aparcamiento: string;
  accesoVehiculos: string;
  conexionWifi: string;
  homologacion: string;
  comentariosMarketing: string;
}

export const PRECIO_CATEGORIAS = ['Bebida', 'Menaje', 'Vajilla', 'Cristalería', 'Mantelería', 'Mobiliario', 'Decoración', 'Maquinaria', 'Transporte', 'Hielo'] as const;
export type PrecioCategoria = typeof PRECIO_CATEGORIAS[number];

export type Precio = {
    id: string;
    producto: string;
    categoria: PrecioCategoria;
    loc: string;
    precioUd: number;
    precioAlquilerUd: number;
    pvp: number;
    iva: number;
    imagen: string;
    isDeliveryProduct?: boolean;
}

export type AlquilerDBItem = {
  id: string;
  concepto: string;
  precioAlquiler: number;
  precioReposicion: number;
  imagen: string;
};

export type TipoServicio = {
    id: string;
    servicio: string;
}

export type ProveedorTransporte = {
    id: string;
    proveedorId: string;
    nombreProveedor: string;
    tipoTransporte: string; // Ej. "Furgoneta Isotermo"
    precio: number;
    tipo: 'Catering' | 'Entregas';
}

export type CategoriaPersonal = {
  id: string;
  proveedorId: string;
  nombreProveedor: string;
  categoria: string;
  precioHora: number;
};

export type ComercialBriefingItem = {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    conGastronomia: boolean;
    descripcion: string;
    comentarios: string;
    sala: string;
    asistentes: number;
    precioUnitario: number;
    importeFijo?: number;
    bebidas?: string;
    matBebida?: string;
    materialGastro?: string;
    manteleria?: string;
};

export type ComercialBriefing = {
    osId: string;
    items: ComercialBriefingItem[];
}

export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Listo' | 'Incidencia';

export type GastronomyOrderItem = {
    id: string; // Receta ID
    type: 'item' | 'separator';
    nombre: string;
    categoria?: string;
    costeMateriaPrima?: number;
    quantity?: number;
}

export type GastronomyOrder = {
    id: string; // briefing item ID
    osId: string;
    status: GastronomyOrderStatus;
    descripcion: string;
    fecha: string;
    horaInicio: string;
    asistentes: number;
    comentarios?: string;
    sala?: string;
    items: GastronomyOrderItem[];
    total: number;
}

export type TransporteOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    tipoTransporte: string;
    precio: number;
    lugarRecogida: string;
    horaRecogida: string;
    lugarEntrega: string;
    horaEntrega: string;
    observaciones?: string;
    status: 'Pendiente' | 'Confirmado' | 'En Ruta' | 'Entregado';
    firmaUrl?: string;
    firmadoPor?: string;
    dniReceptor?: string;
    fechaFirma?: string;
    hitosIds?: string[]; // For Entregas, to link multiple deliveries
}

export type HieloOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    items: { id: string; producto: string; precio: number; cantidad: number }[];
    total: number;
    observaciones: string;
    status: 'Pendiente' | 'Confirmado' | 'En reparto' | 'Entregado';
};

export type DecoracionDBItem = {
  id: string;
  concepto: string;
  precio: number;
};

export type DecoracionOrder = {
  id: string;
  osId: string;
  fecha: string;
  concepto: string;
  precio: number;
  observaciones?: string;
};

export type AtipicoDBItem = {
  id: string;
  concepto: string;
  precio: number;
};

export type AtipicoOrder = {
  id: string;
  osId: string;
  fecha: string;
  concepto: string;
  observaciones?: string;
  precio: number;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
};

export type PersonalMiceOrder = {
    id: string;
    osId: string;
    centroCoste: 'SALA' | 'COCINA' | 'LOGISTICA' | 'RRHH';
    nombre: string;
    dni: string;
    tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
    horaEntrada: string;
    horaSalida: string;
    precioHora: number;
    horaEntradaReal?: string;
    horaSalidaReal?: string;
}

export type PersonalExternoOrder = {
  id: string;
  osId: string;
  proveedorId: string;
  categoria: string;
  cantidad: number;
  precioHora: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  observaciones?: string;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
};

export type PruebaMenuItem = {
    id: string;
    type: 'header' | 'item';
    mainCategory: 'BODEGA' | 'GASTRONOMÍA';
    referencia: string;
    observaciones?: string;
};

export type PruebaMenuData = {
    osId: string;
    items: PruebaMenuItem[];
    observacionesGenerales: string;
    costePruebaMenu?: number;
};

export type CtaExplotacionObjetivos = {
    gastronomia: number;
    bodega: number;
    consumibles: number;
    hielo: number;
    almacen: number;
    alquiler: number;
    transporte: number;
    decoracion: number;
    atipicos: number;
    personalMice: number;
    personalExterno: number;
    costePruebaMenu: number;
}

export type ObjetivosGasto = CtaExplotacionObjetivos & {
    id: string;
    name: string;
};

export type PersonalExternoAjuste = {
    id: string;
    concepto: string;
    ajuste: number;
}
export const UNIDADES_MEDIDA = ['UNIDAD', 'KILO', 'LITRO', 'GRAMO', 'BOTELLA', 'CAJA', 'PACK'] as const;
export type UnidadMedida = typeof UNIDADES_MEDIDA[number];

export const ingredienteErpSchema = z.object({
  id: z.string(),
  IdERP: z.string(),
  nombreProductoERP: z.string().min(1, 'El nombre del producto es obligatorio'),
  referenciaProveedor: z.string(),
  nombreProveedor: z.string(),
  familiaCategoria: z.string(),
  precio: z.coerce.number().min(0),
  unidad: z.enum(UNIDADES_MEDIDA),
});

export type IngredienteERP = z.infer<typeof ingredienteErpSchema>;

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS_DE_CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    mermaPorcentaje: number;
    alergenosPresentes: Alergeno[];
    alergenosTrazas: Alergeno[];
}

export type ComponenteElaboracion = {
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string; // ID of IngredienteInterno or another Elaboracion
    nombre: string;
    cantidad: number;
    costePorUnidad: number;
}

export type Elaboracion = {
    id: string;
    nombre: string;
    produccionTotal: number;
    unidadProduccion: UnidadMedida;
    partidaProduccion: PartidaProduccion;
    componentes: ComponenteElaboracion[];
    instruccionesPreparacion: string;
    fotosProduccionURLs?: string[];
    videoProduccionURL?: string;
    formatoExpedicion: string;
    ratioExpedicion: number;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    costePorUnidad?: number;
    alergenos?: Alergeno[];
}

export type ElaboracionEnReceta = {
  id: string;
  elaboracionId: string;
  nombre: string;
  cantidad: number;
  coste: number;
  gramaje: number;
  alergenos?: Alergeno[];
  unidad: 'KILO' | 'LITRO' | 'UNIDAD';
  merma: number;
}

export type MenajeDB = {
    id: string;
    descripcion: string;
    fotoURL?: string;
}

export type MenajeEnReceta = {
    id: string;
    menajeId: string;
    descripcion: string;
    ratio: number;
}

export const SABORES_PRINCIPALES = ['DULCE', 'SALADO', 'ÁCIDO', 'AMARGO', 'UMAMI'] as const;
export type SaborPrincipal = typeof SABORES_PRINCIPALES[number];

export const PARTIDAS_PRODUCCION = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'] as const;
export type PartidaProduccion = typeof PARTIDAS_PRODUCCION[number];

export type Receta = {
    id: string;
    numeroReceta?: string;
    nombre: string;
    nombre_en?: string;
    visibleParaComerciales: boolean;
    descripcionComercial: string;
    descripcionComercial_en?: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion?: string; // Calculated field
    gramajeTotal?: number;
    estacionalidad: 'INVIERNO' | 'VERANO' | 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO' | 'AMBOS' | 'NINGUNO';
    porcentajeCosteProduccion: number;
    elaboraciones: ElaboracionEnReceta[];
    menajeAsociado: MenajeEnReceta[];
    instruccionesMiseEnPlace: string;
    fotosMiseEnPlaceURLs?: string[];
    instruccionesRegeneracion: string;
    fotosRegeneracionURLs?: string[];
    instruccionesEmplatado: string;
    fotosEmplatadoURLs?: string[];
    perfilSaborPrincipal?: SaborPrincipal;
    perfilSaborSecundario?: string[];
    perfilTextura?: string[];
    tipoCocina?: string;
    temperaturaServicio?: 'CALIENTE' | 'TIBIO' | 'AMBIENTE' | 'FRIO' | 'HELADO';
    tecnicaCoccionPrincipal?: string;
    potencialMiseEnPlace?: 'COMPLETO' | 'PARCIAL' | 'AL_MOMENTO';
    formatoServicioIdeal?: string[];
    equipamientoCritico?: string[];
    dificultadProduccion?: number; // 1-5
    estabilidadBuffet?: number; // 1-5
    escalabilidad?: 'FACIL' | 'MEDIA' | 'DIFICIL';
    etiquetasTendencia?: string[];
    // Calculated fields
    costeMateriaPrima?: number;
    precioVenta?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
}

export type CategoriaReceta = {
    id: string;
    nombre: string;
}
export type TipoCocina = {
    id: string;
    nombre: string;
}

export type OrdenFabricacion = {
    id: string;
    fechaCreacion: string;
    fechaProduccionPrevista: string;
    fechaAsignacion?: string;
    fechaInicioProduccion?: string;
    fechaFinalizacion?: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadTotal: number;
    cantidadReal?: number;
    necesidadTotal?: number;
    unidad: UnidadMedida;
    partidaAsignada: PartidaProduccion;
    responsable?: string;
    estado: 'Pendiente' | 'Asignada' | 'En Proceso' | 'Finalizado' | 'Validado' | 'Incidencia';
    osIDs: string[];
    incidencia: boolean;
    incidenciaObservaciones?: string;
    okCalidad: boolean;
    responsableCalidad?: string;
    fechaValidacionCalidad?: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
}

export type PickingItemState = {
    checked: boolean;
    pickedQuantity: number;
    incidentComment?: string;
};

export type PickingSheet = {
    id: string; // Composite key: `${osId}-${fechaNecesidad}`
    osId: string;
    fechaNecesidad: string;
    items: (OrderItem & { type: MaterialOrderType })[];
    status: 'Pendiente' | 'En Proceso' | 'Listo';
    checkedItems?: string[];
    itemStates?: Record<string, Omit<PickingItemState, 'itemCode'>>;
    os?: ServiceOrder;
};

export type ContenedorIsotermo = {
    id: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type LoteAsignado = {
    allocationId: string;
    ofId: string;
    containerId: string;
    quantity: number;
    hitoId: string;
}
export type ContenedorDinamico = {
    id: string;
    hitoId: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type PickingStatus = 'Pendiente' | 'Preparado' | 'Enviado' | 'Entregado' | 'Retornado';
export type PickingState = {
    osId: string;
    status: PickingStatus;
    assignedContainers: ContenedorDinamico[];
    itemStates: LoteAsignado[];
};
export type PedidoPlantillaItem = {
    itemCode: string;
    quantity: number;
    description: string;
};
export type PedidoPlantilla = {
    id: string;
    nombre: string;
    tipo: MaterialOrderType;
    items: PedidoPlantillaItem[];
};
export type MaterialOrderType = 'Almacén' | 'Bodega' | 'Bio' | 'Alquiler';
export type FormatoExpedicion = {
  id: string;
  nombre: string;
};

export type ExcedenteProduccion = {
    ofId: string;
    fechaProduccion: string;
    diasCaducidad?: number;
    cantidadAjustada: number;
    motivoAjuste: string;
    fechaAjuste: string;
}

// ---- NUEVA VERTICAL DE ENTREGAS ----

export const CATEGORIAS_PRODUCTO_VENTA = ['Gastronomía', 'Bodega', 'Consumibles', 'Almacen', 'Personal', 'Transporte', 'Otros'] as const;
export type CategoriaProductoVenta = typeof CATEGORIAS_PRODUCTO_VENTA[number];

export type ImagenProducto = {
  id: string;
  url: string;
  isPrincipal: boolean;
}

export type ProductoVenta = {
    id: string;
    nombre: string;
    nombre_en?: string;
    categoria: CategoriaProductoVenta;
    ubicacion?: string;
    imagenes: ImagenProducto[];
    pvp: number;
    pvpIfema?: number;
    iva: number;
    producidoPorPartner: boolean;
    partnerId?: string;
    recetaId?: string;
    erpId?: string;
    exclusivoIfema?: boolean;
}

export type PedidoEntregaItem = {
    id: string; // ProductoVenta ID
    nombre: string;
    quantity: number;
    pvp: number;
    coste: number;
    categoria: CategoriaProductoVenta;
};
export type EntregaHito = {
    id: string;
    fecha: string;
    hora: string;
    lugarEntrega: string;
    localizacion?: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    observaciones?: string;
    items: PedidoEntregaItem[];
    portes?: number;
    horasCamarero?: number;
}
export type PedidoEntrega = {
    osId: string;
    hitos: EntregaHito[];
};
export type Entrega = ServiceOrder & {
    vertical: 'Entregas';
    tarifa: 'Empresa' | 'IFEMA';
};
export type PedidoPartner = {
    id: string; // hitoId-productoId
    osId: string;
    serviceNumber: string;
    cliente: string;
    fechaEntrega: string; // En CPR MICE
    horaEntrega: string;  // En CPR MICE
    elaboracionId: string;
    elaboracionNombre: string;
    cantidad: number;
    unidad: UnidadMedida;
}
export type PedidoPartnerStatus = 'Pendiente' | 'En Producción' | 'Listo para Entrega';
export type PickingIncidencia = {
  itemId: string;
  comment: string;
  timestamp: string;
};
export type PickingEntregaState = {
  hitoId: string;
  status: 'Pendiente' | 'En Proceso' | 'Preparado';
  checkedItems: Set<string>;
  incidencias: PickingIncidencia[];
  fotoUrl: string | null;
  ordenItems?: string[];
};

export const TIPO_ENTIDAD_FISCAL = ['Cliente', 'Proveedor', 'Propia'] as const;
export type TipoEntidadFiscal = typeof TIPO_ENTIDAD_FISCAL[number];

export type DatosFiscales = {
    id: string;
    cif: string;
    nombreEmpresa: string;
    nombreComercial?: string;
    direccionFacturacion: string;
    codigoPostal: string;
    ciudad: string;
    provincia: string;
    pais: string;
    emailContacto: string;
    telefonoContacto: string;
    iban?: string;
    formaDePagoHabitual?: string;
    tipo: TipoEntidadFiscal;
}

export const TIPO_PROVEEDOR_OPCIONES = ['Transporte', 'Hielo', 'Gastronomia', 'Personal', 'Atipicos', 'Decoracion', 'Servicios', 'Otros'] as const;
export type TipoProveedor = typeof TIPO_PROVEEDOR_OPCIONES[number];

export type Proveedor = {
  id: string;
  datosFiscalesId: string;
  nombreComercial: string;
  tipos: TipoProveedor[];
}

export const ESTADO_PERSONAL_ENTREGA = ['Pendiente', 'Asignado'] as const;
export type EstadoPersonalEntrega = typeof ESTADO_PERSONAL_ENTREGA[number];

export type AsignacionPersonal = {
  id: string;
  nombre: string;
  dni?: string;
  telefono?: string;
  comentarios?: string;
  comentariosMice?: string;
  rating?: number;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
};

export type PersonalEntregaTurno = {
  id: string;
  proveedorId: string;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  categoria: string;
  precioHora: number;
  observaciones: string;
  statusPartner: 'Pendiente Asignación' | 'Gestionado';
  asignaciones: AsignacionPersonal[];
  requiereActualizacion?: boolean;
};

export type PersonalEntrega = {
    osId: string;
    turnos: PersonalEntregaTurno[];
    status: EstadoPersonalEntrega;
    observacionesGenerales?: string;
};


// --- PORTAL & AUTH ---
export const PORTAL_ROLES = ['Partner Gastronomia', 'Partner Personal', 'Transporte', 'Admin', 'Comercial', 'CPR', 'Pase', 'Dirección', 'Almacen', 'Operaciones', 'Project Manager'] as const;
export type PortalUserRole = typeof PORTAL_ROLES[number];

export type PortalUser = {
  id: string;
  email: string;
  nombre: string;
  roles: PortalUserRole[];
  proveedorId?: string; // Linked to Proveedor DB
}

export type ActivityLog = {
    id: string;
    timestamp: string; // ISO 8601
    userId: string;
    userName: string;
    userRole: PortalUserRole;
    action: string;
    details: string;
    entityId: string; // ID of the entity being acted upon (e.g., OS ID, Turno ID)
}
