

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Building, X, PlusCircle, Trash2, Info, ImagePlus, Star, Link as LinkIcon } from 'lucide-react';
import type { Espacio, RelacionComercial, ImagenEspacio } from '@/types';
import { TIPO_ESPACIO, ESTILOS_ESPACIO, TAGS_ESPACIO, IDEAL_PARA } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const salaSchema = z.object({
  id: z.string(),
  nombreSala: z.string().min(1, "Nombre es obligatorio"),
  m2: z.coerce.number().optional().default(0),
  dimensiones: z.string().optional().default(''),
  alturaMax: z.coerce.number().optional().default(0),
  alturaMin: z.coerce.number().optional().default(0),
  aforoTeatro: z.coerce.number().optional().default(0),
  aforoEscuela: z.coerce.number().optional().default(0),
  aforoCabaret: z.coerce.number().optional().default(0),
  aforoCocktailSala: z.coerce.number().optional().default(0),
  esDiafana: z.boolean().default(false),
  tieneLuzNatural: z.boolean().default(false),
});

const contactoSchema = z.object({
    id: z.string(),
    nombre: z.string().min(1, "Nombre es obligatorio"),
    cargo: z.string().optional().default(''),
    telefono: z.string().optional().default(''),
    email: z.string().email("Email inválido").or(z.literal('')),
});

const cuadroElectricoSchema = z.object({
    id: z.string(),
    ubicacion: z.string().min(1, "Ubicación requerida"),
    potencia: z.string(),
});

const imagenEspacioSchema = z.object({
    id: z.string(),
    url: z.string().url("URL inválida"),
    isPrincipal: z.boolean().default(false),
});


export const espacioFormSchema = z.object({
  id: z.string(),
  identificacion: z.object({
    nombreEspacio: z.string().min(1, 'El nombre es obligatorio'),
    tipoDeEspacio: z.array(z.string()).min(1, "Selecciona al menos un tipo"),
    descripcionCorta: z.string().optional().default(''),
    descripcionLarga: z.string().optional().default(''),
    ciudad: z.string().min(1, "La ciudad es obligatoria"),
    provincia: z.string().min(1, "La provincia es obligatoria"),
    calle: z.string().min(1, "La calle es obligatoria"),
    codigoPostal: z.string().min(1, "El C.P. es obligatorio"),
    zona: z.string().optional().default(''),
    estilos: z.array(z.string()).optional().default([]),
    tags: z.array(z.string()).optional().default([]),
    idealPara: z.array(z.string()).optional().default([]),
  }),
  capacidades: z.object({
    aforoMaximoCocktail: z.coerce.number().optional().default(0),
    aforoMaximoBanquete: z.coerce.number().optional().default(0),
    salas: z.array(salaSchema).optional().default([]),
  }),
  logistica: z.object({
    accesoVehiculos: z.string().optional().default(''),
    horarioMontajeDesmontaje: z.string().optional().default(''),
    montacargas: z.boolean().default(false),
    dimensionesMontacargas: z.string().optional().default(''),
    accesoServicioIndependiente: z.boolean().default(false),
    potenciaTotal: z.string().optional().default(''),
    cuadrosElectricos: z.array(cuadroElectricoSchema).optional().default([]),
    tomasAgua: z.array(z.string()).optional().default([]),
    desagues: z.array(z.string()).optional().default([]),
    tipoCocina: z.enum(['Cocina completa', 'Office de regeneración', 'Sin cocina']).default('Sin cocina'),
    equipamientoCocina: z.array(z.string()).optional().default([]),
    potenciaElectricaCocina: z.string().optional().default(''),
    tomasAguaCocina: z.boolean().default(false),
    desaguesCocina: z.boolean().default(false),
    extraccionHumos: z.boolean().default(false),
    descripcionOffice: z.string().optional().default(''),
    zonaAlmacenaje: z.string().optional().default(''),
    limitadorSonido: z.boolean().default(false),
    permiteMusicaExterior: z.boolean().default(false),
    politicaDecoracion: z.string().optional().default(''),
    puntosAnclaje: z.boolean().default(false),
    metricasOperativas: z.object({
        dificultadMontaje: z.coerce.number().min(1).max(5).optional().default(3),
        penalizacionPersonalMontaje: z.coerce.number().optional().default(0),
        notasDificultadMontaje: z.string().optional().default(''),
    }).optional(),
  }),
  evaluacionMICE: z.object({
    proveedorId: z.string().optional().default(''),
    relacionComercial: z.enum(['Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación']).default('Sin Relación'),
    valoracionComercial: z.coerce.number().min(1).max(5).optional().default(3),
    puntosFuertes: z.array(z.string()).optional().default([]),
    puntosDebiles: z.array(z.string()).optional().default([]),
    perfilClienteIdeal: z.string().optional().default(''),
    argumentarioVentaRapido: z.array(z.string()).optional().default([]),
    exclusividadMusica: z.boolean().default(false),
    exclusividadAudiovisuales: z.boolean().default(false),
    otrosProveedoresExclusivos: z.string().optional().default(''),
    notasComerciales: z.string().optional().default(''),
    resumenEjecutivoIA: z.string().optional().default(''),
    valoracionOperaciones: z.coerce.number().min(1).max(5).optional().default(3),
    factoresCriticosExito: z.array(z.string()).optional().default([]),
    riesgosPotenciales: z.array(z.string()).optional().default([]),
  }),
  experienciaInvitado: z.object({
    flow: z.object({
        accesoPrincipal: z.string().optional().default(''),
        recorridoInvitado: z.string().optional().default(''),
        aparcamiento: z.string().optional().default(''),
        transportePublico: z.string().optional().default(''),
        accesibilidadAsistentes: z.string().optional().default(''),
        guardarropa: z.boolean().default(false),
        seguridadPropia: z.boolean().default(false),
    }),
    equipamientoAudiovisuales: z.string().optional().default(''),
    pantalla: z.string().optional().default(''),
    sistemaSonido: z.string().optional().default(''),
    escenario: z.string().optional().default(''),
    conexionWifi: z.string().optional().default(''),
  }),
  multimedia: z.object({
    imagenes: z.array(imagenEspacioSchema).optional().default([]),
    carpetaDRIVE: z.string().url("URL inválida.").or(z.literal("")).optional().default(''),
    visitaVirtual: z.string().url("URL inválida.").or(z.literal("")).optional().default(''),
  }).optional(),
  contactos: z.array(contactoSchema).optional().default([]),
});


type EspacioFormValues = z.infer<typeof espacioFormSchema>;

const defaultValues: Partial<EspacioFormValues> = {
  id: '',
  identificacion: {
    nombreEspacio: '', tipoDeEspacio: [], ciudad: '', provincia: 'Madrid', calle: '', codigoPostal: '',
    descripcionCorta: '', descripcionLarga: '', zona: '', estilos: [], tags: [], idealPara: []
  },
  capacidades: { salas: [], aforoMaximoBanquete: 0, aforoMaximoCocktail: 0 },
  logistica: {
    tipoCocina: 'Sin cocina', montacargas: false, accesoServicioIndependiente: false, tomasAguaCocina: false, desaguesCocina: false, extraccionHumos: false, limitadorSonido: false, permiteMusicaExterior: false, puntosAnclaje: false,
    accesoVehiculos: '', horarioMontajeDesmontaje: '', dimensionesMontacargas: '', potenciaTotal: '', cuadrosElectricos: [], tomasAgua: [], desagues: [], equipamientoCocina: [], potenciaElectricaCocina: '', descripcionOffice: '', zonaAlmacenaje: '', politicaDecoracion: '',
    metricasOperativas: { dificultadMontaje: 3, penalizacionPersonalMontaje: 0, notasDificultadMontaje: '' }
  },
  evaluacionMICE: {
    relacionComercial: 'Sin Relación', valoracionComercial: 3, valoracionOperaciones: 3, exclusividadMusica: false, exclusividadAudiovisuales: false,
    proveedorId: '', puntosFuertes: [], puntosDebiles: [], perfilClienteIdeal: '', argumentarioVentaRapido: [], otrosProveedoresExclusivos: '', notasComerciales: '', resumenEjecutivoIA: '', factoresCriticosExito: [], riesgosPotenciales: []
  },
  experienciaInvitado: {
    flow: { accesoPrincipal: '', recorridoInvitado: '', aparcamiento: '', transportePublico: '', accesibilidadAsistentes: '', guardarropa: false, seguridadPropia: false },
    equipamientoAudiovisuales: '', pantalla: '', sistemaSonido: '', escenario: '', conexionWifi: ''
  },
  multimedia: { imagenes: [], carpetaDRIVE: '', visitaVirtual: '' },
  contactos: [],
};


const InfoTooltip = ({ text }: { text: string }) => (
    <Tooltip>
        <TooltipTrigger type="button" asChild>
            <span className="ml-1.5 cursor-help"><Info className="h-3 w-3 text-muted-foreground"/></span>
        </TooltipTrigger>
        <TooltipContent>
            <p className="max-w-xs">{text}</p>
        </TooltipContent>
    </Tooltip>
);

const RELACION_COMERCIAL_OPCIONES: RelacionComercial[] = ['Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación'];

export default function EspacioFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<EspacioFormValues>({
    resolver: zodResolver(espacioFormSchema),
    defaultValues: defaultValues as any,
  });

  const { fields: salasFields, append: appendSala, remove: removeSala } = useFieldArray({ control: form.control, name: "capacidades.salas" });
  const { fields: contactosFields, append: appendContacto, remove: removeContacto } = useFieldArray({ control: form.control, name: "contactos" });
  const { fields: cuadrosFields, append: appendCuadro, remove: removeCuadro } = useFieldArray({ control: form.control, name: "logistica.cuadrosElectricos" });
  const { fields: imagenesFields, append: appendImagen, remove: removeImagen, update: updateImagen } = useFieldArray({ control: form.control, name: "multimedia.imagenes" });
  
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    if (isEditing) {
      const espacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
      const espacio = espacios.find(e => e.id === id);
      if (espacio) {
        form.reset(espacio);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el espacio.' });
        router.push('/espacios');
      }
    } else {
        form.reset({
            ...(defaultValues as any),
            id: Date.now().toString(),
        });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: EspacioFormValues) {
    setIsLoading(true);

    let allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
    let message = '';
    
    if (isEditing) {
      const index = allEspacios.findIndex(e => e.id === id);
      if (index !== -1) {
        allEspacios[index] = data as Espacio;
        message = 'Espacio actualizado correctamente.';
      }
    } else {
       const existing = allEspacios.find(e => e.identificacion.nombreEspacio.toLowerCase() === data.identificacion.nombreEspacio.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un espacio con este nombre.' });
            setIsLoading(false);
            return;
        }
      allEspacios.push(data as Espacio);
      message = 'Espacio creado correctamente.';
    }

    localStorage.setItem('espacios', JSON.stringify(allEspacios));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/espacios');
    }, 1000);
  }
  
  const handleAddImageUrl = () => {
    try {
        const url = new URL(newImageUrl);
        appendImagen({ id: Date.now().toString(), url: url.href, isPrincipal: imagenesFields.length === 0 });
        setNewImageUrl('');
    } catch(e) {
        toast({ variant: 'destructive', title: 'URL inválida', description: 'Por favor, introduce una URL de imagen válida.'});
    }
  }

  const setPrincipalImage = (indexToSet: number) => {
    imagenesFields.forEach((field, index) => {
        updateImagen(index, { ...field, isPrincipal: index === indexToSet });
    });
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Building className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Espacio</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/espacios')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="espacio-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Espacio'}</span>
            </Button>
          </div>
        </div>

      <TooltipProvider>
        <Form {...form}>
          <form id="espacio-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6']} className="w-full space-y-4">
                <AccordionItem value="item-1">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle>Identificación y Clasificación</CardTitle></AccordionTrigger>
                        <AccordionContent>
                        <CardContent className="space-y-4 pt-2">
                             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField control={form.control} name="identificacion.nombreEspacio" render={({ field }) => (
                                    <FormItem className="col-span-2"><FormLabel className="flex items-center">Nombre del Espacio <InfoTooltip text="Nombre oficial del venue. Ej: Palacio de Neptuno" /></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="identificacion.tipoDeEspacio" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center">Tipo de Espacio<InfoTooltip text="Clasificación del venue, se pueden seleccionar varios. Ej: Hotel, Espacio singular"/></FormLabel><MultiSelect options={TIPO_ESPACIO.map(t => ({label: t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/><FormMessage /></FormItem>
                                )} />
                             </div>
                             <FormField control={form.control} name="identificacion.descripcionCorta" render={({ field }) => (
                                <FormItem><FormLabel className="flex items-center">Descripción Corta / Tagline <InfoTooltip text="Un titular o tagline comercial (máx 120 caracteres). Ej: El único palacio del s.XIX con jardines en el centro de Madrid."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                             <FormField control={form.control} name="identificacion.descripcionLarga" render={({ field }) => (
                                <FormItem><FormLabel className="flex items-center">Descripción Larga (Marketing) <InfoTooltip text="Descripción detallada para marketing y propuestas comerciales. Sin límite de caracteres."/></FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
                            )} />
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                 <FormField control={form.control} name="identificacion.calle" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Calle <InfoTooltip text="Dirección completa del espacio. Ej: Calle de Cervantes, 42"/></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.ciudad" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Ciudad<InfoTooltip text="Ciudad donde se ubica el espacio. Ej: Madrid" /></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.provincia" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Provincia<InfoTooltip text="Provincia del espacio. Ej: Madrid" /></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.codigoPostal" render={({ field }) => (<FormItem><FormLabel className="flex items-center">C. Postal<InfoTooltip text="Código postal del espacio. Ej: 28014" /></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name="identificacion.zona" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Zona / Barrio <InfoTooltip text="Barrio o área específica para búsquedas por zona. Ej: 'Barrio de Salamanca', 'Distrito financiero'"/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />

                            <div className="grid md:grid-cols-3 gap-4">
                                 <FormField control={form.control} name="identificacion.estilos" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Estilos<InfoTooltip text="Define la estética del espacio. Ej: Industrial, Clásico, Lujoso"/></FormLabel><MultiSelect options={ESTILOS_ESPACIO.map(t => ({label: t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.tags" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Tags<InfoTooltip text="Características destacadas y buscables. Ej: Terraza, Jardín, Piscina"/></FormLabel><MultiSelect options={TAGS_ESPACIO.map(t => ({label: t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.idealPara" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Ideal Para<InfoTooltip text="Tipo de eventos que mejor encajan en el espacio. Ej: Bodas, Eventos Corporativos"/></FormLabel><MultiSelect options={IDEAL_PARA.map(t => ({label: t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem> )} />
                            </div>
                        </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                 <AccordionItem value="item-6">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle>Contacto y Multimedia</CardTitle></AccordionTrigger>
                        <AccordionContent>
                             <CardContent className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm flex items-center">Contactos del Espacio <InfoTooltip text="Personas de contacto en el venue para diferentes roles (comercial, operaciones, etc.)."/></h4>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Cargo</TableHead><TableHead>Teléfono</TableHead><TableHead>Email</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {contactosFields.map((field, index) => (
                                                    <TableRow key={field.id}>
                                                        <TableCell className="p-1"><FormField control={form.control} name={`contactos.${index}.nombre`} render={({field}) => <Input {...field} className="h-8"/>} /></TableCell>
                                                        <TableCell className="p-1"><FormField control={form.control} name={`contactos.${index}.cargo`} render={({field}) => <Input {...field} className="h-8"/>} /></TableCell>
                                                        <TableCell className="p-1"><FormField control={form.control} name={`contactos.${index}.telefono`} render={({field}) => <Input {...field} className="h-8"/>} /></TableCell>
                                                        <TableCell className="p-1"><FormField control={form.control} name={`contactos.${index}.email`} render={({field}) => <Input type="email" {...field} className="h-8"/>} /></TableCell>
                                                        <TableCell className="p-1 text-right"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeContacto(index)}><Trash2/></Button></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendContacto({id: Date.now().toString(), nombre: '', cargo: '', telefono: '', email: ''})}><PlusCircle className="mr-2"/>Añadir Contacto</Button>
                                 </div>
                                 
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm flex items-center">Imágenes del Espacio</h4>
                                    <div className="flex gap-2">
                                        <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Pega una URL de imagen..."/>
                                        <Button type="button" variant="outline" onClick={handleAddImageUrl}><LinkIcon className="mr-2"/>Añadir URL</Button>
                                    </div>
                                    {form.formState.errors.multimedia?.imagenes && <p className="text-sm font-medium text-destructive">{(form.formState.errors.multimedia?.imagenes as any).message}</p>}
                                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-2">
                                        {imagenesFields.map((field, index) => (
                                            <div key={field.id} className="relative aspect-video rounded-md overflow-hidden group border-2 border-transparent data-[principal=true]:border-primary" data-principal={field.isPrincipal}>
                                                <Image src={field.url} alt={`Foto de producción ${index+1}`} fill className="object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <Tooltip><TooltipTrigger asChild><Button type="button" variant="secondary" size="icon" onClick={() => setPrincipalImage(index)}><Star className={cn("h-5 w-5", field.isPrincipal && "fill-amber-400 text-amber-400")}/></Button></TooltipTrigger><TooltipContent><p>Marcar como principal</p></TooltipContent></Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Button type="button" variant="destructive" size="icon" onClick={() => removeImagen(index)}><Trash2/></Button></TooltipTrigger><TooltipContent><p>Eliminar</p></TooltipContent></Tooltip>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                 
                                 <div className="grid md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name="multimedia.carpetaDRIVE" render={({ field }) => (
                                        <FormItem><FormLabel className="flex items-center">Carpeta de Drive <InfoTooltip text="URL a la carpeta compartida con todos los recursos: fotos, planos, etc."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                    )} />
                                     <FormField control={form.control} name="multimedia.visitaVirtual" render={({ field }) => (
                                        <FormItem><FormLabel className="flex items-center">Visita Virtual <InfoTooltip text="URL al tour virtual 360º del espacio, si existe."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                    )} />
                                 </div>
                             </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle>Capacidades y Distribución</CardTitle></AccordionTrigger>
                        <AccordionContent>
                        <CardContent className="space-y-4 pt-2">
                             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormField control={form.control} name="capacidades.aforoMaximoCocktail" render={({ field }) => ( <FormItem><FormLabel className="flex items-center">Aforo Máx. Cocktail <InfoTooltip text="Número máximo de personas para un evento tipo cóctel en todo el espacio."/></FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="capacidades.aforoMaximoBanquete" render={({ field }) => ( <FormItem><FormLabel className="flex items-center">Aforo Máx. Banquete <InfoTooltip text="Número máximo de personas para un evento tipo banquete en todo el espacio."/></FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                             </div>
                             <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Salas Individuales</h4>
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>m²</TableHead><TableHead>Aforo Teatro</TableHead><TableHead>Aforo Escuela</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {salasFields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell className="p-1"><FormField control={form.control} name={`capacidades.salas.${index}.nombreSala`} render={({field}) => <Input {...field} className="h-8"/>} /></TableCell>
                                                    <TableCell className="p-1"><FormField control={form.control} name={`capacidades.salas.${index}.m2`} render={({field}) => <Input type="number" {...field} className="h-8 w-20"/>} /></TableCell>
                                                    <TableCell className="p-1"><FormField control={form.control} name={`capacidades.salas.${index}.aforoTeatro`} render={({field}) => <Input type="number" {...field} className="h-8 w-20"/>} /></TableCell>
                                                    <TableCell className="p-1"><FormField control={form.control} name={`capacidades.salas.${index}.aforoEscuela`} render={({field}) => <Input type="number" {...field} className="h-8 w-20"/>} /></TableCell>
                                                    <TableCell className="p-1 text-right"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSala(index)}><Trash2/></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => appendSala({id: Date.now().toString(), nombreSala: '', esDiafana: true, tieneLuzNatural: true, m2: 0, aforoTeatro: 0, aforoEscuela: 0, dimensiones: '', alturaMax: 0, alturaMin: 0, aforoCabaret: 0, aforoCocktailSala: 0})}><PlusCircle className="mr-2"/>Añadir Sala</Button>
                             </div>
                        </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="item-3">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle>Logística y Producción</CardTitle></AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="space-y-4 pt-2">
                                <FormField control={form.control} name="logistica.tipoCocina" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center">Cocina<InfoTooltip text="Tipo de instalación de cocina disponible en el venue."/></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Cocina completa">Cocina completa</SelectItem>
                                            <SelectItem value="Office de regeneración">Office de regeneración</SelectItem>
                                            <SelectItem value="Sin cocina">Sin cocina</SelectItem>
                                        </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="logistica.metricasOperativas.dificultadMontaje" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center">Nivel de Dificultad Montaje (1-5) <InfoTooltip text="Valora de 1 (muy fácil) a 5 (muy complejo) la dificultad de producir un evento aquí."/></FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-4 pt-2">
                                                <span>Fácil</span>
                                                <Slider defaultValue={[3]} value={[field.value || 3]} onValueChange={(value) => field.onChange(value[0])} max={5} min={1} step={1} />
                                                <span>Difícil</span>
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="logistica.metricasOperativas.penalizacionPersonalMontaje" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center">% Penalización Personal Montaje<InfoTooltip text="Porcentaje de personal extra que se estima necesario por la dificultad. Ej: 10 para un 10%."/></FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                 <FormField control={form.control} name="logistica.metricasOperativas.notasDificultadMontaje" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center">Notas sobre Dificultad Montaje<InfoTooltip text="Explica por qué el montaje es difícil. Ej: 'Muchas escaleras, sin montacargas, suelo delicado...'"/></FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                                )} />
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm flex items-center">Cuadros Eléctricos <InfoTooltip text="Detalla la potencia y ubicación de cada cuadro eléctrico disponible."/></h4>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Ubicación</TableHead><TableHead>Potencia</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {cuadrosFields.map((field, index) => (
                                                    <TableRow key={field.id}>
                                                        <TableCell className="p-1"><FormField control={form.control} name={`logistica.cuadrosElectricos.${index}.ubicacion`} render={({field}) => <Input {...field} className="h-8"/>} /></TableCell>
                                                        <TableCell className="p-1"><FormField control={form.control} name={`logistica.cuadrosElectricos.${index}.potencia`} render={({field}) => <Input {...field} className="h-8"/>} /></TableCell>
                                                        <TableCell className="p-1 text-right"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCuadro(index)}><Trash2/></Button></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendCuadro({id: Date.now().toString(), ubicacion: '', potencia: ''})}><PlusCircle className="mr-2"/>Añadir Cuadro Eléctrico</Button>
                                 </div>
                                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     <FormField control={form.control} name="logistica.accesoVehiculos" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Acceso Vehículos<InfoTooltip text="Describe hasta dónde pueden llegar los vehículos de carga. Ej: 'Camión 3.5T hasta puerta de cocina'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                     <FormField control={form.control} name="logistica.horarioMontajeDesmontaje" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Horario Montaje/Desmontaje<InfoTooltip text="Indica si hay restricciones horarias para montar y desmontar. Ej: 'De 08:00 a 22:00, fuera de ese horario consultar'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                      <FormField control={form.control} name="logistica.dimensionesMontacargas" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Dimensiones Montacargas<InfoTooltip text="Medidas del montacargas si existe. Ej: '2.5m x 1.8m x 2.2m'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                      <FormField control={form.control} name="logistica.potenciaTotal" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Potencia Total<InfoTooltip text="Potencia eléctrica total disponible en el venue. Ej: '150 kW'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                      <FormField control={form.control} name="logistica.descripcionOffice" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Descripción Office<InfoTooltip text="Si no hay cocina, describe el office. Ej: 'Office con 2 neveras, fregadero y 3 mesas de trabajo'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                      <FormField control={form.control} name="logistica.zonaAlmacenaje" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Zona Almacenaje<InfoTooltip text="Describe el espacio disponible para almacenar nuestro material durante el evento. Ej: 'Almacén de 20m² junto a la sala principal'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                 </div>
                                 <FormField control={form.control} name="logistica.politicaDecoracion" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Política de Decoración<InfoTooltip text="Restricciones o normas sobre la decoración. Ej: 'Prohibido clavar o pegar en paredes. No se permite confeti'."/></FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem> )} />
                                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                      <FormField control={form.control} name="logistica.montacargas" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Tiene Montacargas?</FormLabel></FormItem>)} />
                                      <FormField control={form.control} name="logistica.accesoServicioIndependiente" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Acceso de Servicio Independiente?</FormLabel></FormItem>)} />
                                      <FormField control={form.control} name="logistica.tomasAguaCocina" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Tomas de Agua en Cocina?</FormLabel></FormItem>)} />
                                      <FormField control={form.control} name="logistica.desaguesCocina" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Desagües en Cocina?</FormLabel></FormItem>)} />
                                      <FormField control={form.control} name="logistica.extraccionHumos" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Extracción de Humos?</FormLabel></FormItem>)} />
                                      <FormField control={form.control} name="logistica.limitadorSonido" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Limitador de Sonido?</FormLabel></FormItem>)} />
                                      <FormField control={form.control} name="logistica.permiteMusicaExterior" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Permite Música en Exterior?</FormLabel></FormItem>)} />
                                      <FormField control={form.control} name="logistica.puntosAnclaje" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Puntos de Anclaje (Rigging)?</FormLabel></FormItem>)} />
                                  </div>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                 <AccordionItem value="item-4">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle>Evaluación MICE</CardTitle></AccordionTrigger>
                        <AccordionContent>
                             <CardContent className="space-y-4 pt-2">
                                <FormField control={form.control} name="evaluacionMICE.relacionComercial" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center">Relación Comercial<InfoTooltip text="Define nuestra relación contractual con el venue. Clave para la priorización comercial."/></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {RELACION_COMERCIAL_OPCIONES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                <div className="grid md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name="evaluacionMICE.valoracionComercial" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Valoración Comercial (1-5)<InfoTooltip text="Nuestra valoración interna sobre el potencial de venta del espacio." /></FormLabel><FormControl><Slider defaultValue={[3]} value={[field.value || 3]} onValueChange={(value) => field.onChange(value[0])} max={5} min={1} step={1} /></FormControl></FormItem>)} />
                                     <FormField control={form.control} name="evaluacionMICE.valoracionOperaciones" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Valoración Operaciones (1-5)<InfoTooltip text="Nuestra valoración interna sobre la facilidad para operar eventos en el espacio." /></FormLabel><FormControl><Slider defaultValue={[3]} value={[field.value || 3]} onValueChange={(value) => field.onChange(value[0])} max={5} min={1} step={1} /></FormControl></FormItem>)} />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="evaluacionMICE.puntosFuertes" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Puntos Fuertes<InfoTooltip text="Añade las ventajas clave del espacio. Ej: 'Vistas espectaculares', 'Ubicación céntrica'."/></FormLabel><MultiSelect options={[]} selected={field.value || []} onChange={field.onChange} placeholder="Añadir..." onCreated={(val) => field.onChange([...(field.value || []), val])}/></FormItem>)} />
                                    <FormField control={form.control} name="evaluacionMICE.puntosDebiles" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Puntos Débiles<InfoTooltip text="Añade las desventajas o dificultades del espacio. Ej: 'Acceso complicado', 'Canon elevado'."/></FormLabel><MultiSelect options={[]} selected={field.value || []} onChange={field.onChange} placeholder="Añadir..." onCreated={(val) => field.onChange([...(field.value || []), val])}/></FormItem>)} />
                                </div>
                                 <FormField control={form.control} name="evaluacionMICE.perfilClienteIdeal" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Perfil de Cliente Ideal<InfoTooltip text="Describe para qué tipo de cliente es perfecto el espacio. Ej: 'Cliente de lujo del sector tecnológico'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="evaluacionMICE.argumentarioVentaRapido" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Argumentario de Venta Rápido<InfoTooltip text="Frases de venta listas para usar. Ej: 'El único con jardín en la azotea en Gran Vía'."/></FormLabel><MultiSelect options={[]} selected={field.value || []} onChange={field.onChange} placeholder="Añadir argumento..." onCreated={(val) => field.onChange([...(field.value || []), val])}/></FormItem>)} />
                                <FormField control={form.control} name="evaluacionMICE.factoresCriticosExito" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Factores Críticos de Éxito<InfoTooltip text="¿Qué debe salir sí o sí bien para que el evento sea un éxito? Ej: 'El control del sonido en la terraza'."/></FormLabel><MultiSelect options={[]} selected={field.value || []} onChange={field.onChange} placeholder="Añadir factor..." onCreated={(val) => field.onChange([...(field.value || []), val])}/></FormItem>)} />
                                <FormField control={form.control} name="evaluacionMICE.riesgosPotenciales" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Riesgos Potenciales<InfoTooltip text="¿Qué suele fallar o qué riesgos hay? Ej: 'Cortes de luz', 'Quejas de ruido'."/></FormLabel><MultiSelect options={[]} selected={field.value || []} onChange={field.onChange} placeholder="Añadir riesgo..." onCreated={(val) => field.onChange([...(field.value || []), val])}/></FormItem>)} />
                                <FormField control={form.control} name="evaluacionMICE.otrosProveedoresExclusivos" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Otros Proveedores Exclusivos<InfoTooltip text="Si hay exclusividad con otros proveedores (floristas, etc.), indícalo aquí."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="evaluacionMICE.notasComerciales" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Notas Comerciales Internas<InfoTooltip text="Cualquier información comercial relevante que no encaje en otro campo."/></FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="evaluacionMICE.resumenEjecutivoIA" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Resumen Ejecutivo (IA)<InfoTooltip text="Este campo puede ser usado por una IA para generar un resumen automático del espacio."/></FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />

                             </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="item-5">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle>Experiencia del Invitado</CardTitle></AccordionTrigger>
                        <AccordionContent>
                             <CardContent className="space-y-4 pt-2">
                                <FormField control={form.control} name="experienciaInvitado.flow.accesoPrincipal" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Acceso Principal<InfoTooltip text="Cómo acceden los invitados. Ej: 'Recepción principal del hotel', 'Entrada directa desde la calle'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="experienciaInvitado.flow.recorridoInvitado" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Recorrido del Invitado<InfoTooltip text="Describe el flujo que siguen los invitados dentro del espacio. Ej: 'Recepción en planta baja, subida a la planta 33 para el cóctel'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="experienciaInvitado.flow.aparcamiento" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Aparcamiento<InfoTooltip text="Detalles sobre el parking. Ej: 'Valet parking', 'Parking público de pago a 200m'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="experienciaInvitado.flow.transportePublico" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Transporte Público Cercano<InfoTooltip text="Paradas de metro, bus o tren más próximas."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="experienciaInvitado.flow.accesibilidadAsistentes" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Accesibilidad para Asistentes<InfoTooltip text="Información sobre la accesibilidad para personas con movilidad reducida. Ej: 'Acceso y baños adaptados'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="experienciaInvitado.equipamientoAudiovisuales" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Equipamiento Audiovisual<InfoTooltip text="Describe el equipo A/V disponible. Ej: 'Equipo básico integrado', 'Partner A/V exclusivo'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <div className="grid md:grid-cols-3 gap-4">
                                     <FormField control={form.control} name="experienciaInvitado.pantalla" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Pantalla<InfoTooltip text="Detalles de la pantalla. Ej: 'Pantalla LED de 4x3m'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                     <FormField control={form.control} name="experienciaInvitado.sistemaSonido" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Sistema de Sonido<InfoTooltip text="Detalles del sistema de sonido. Ej: 'Altavoces integrados para música ambiente'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                     <FormField control={form.control} name="experienciaInvitado.escenario" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Escenario<InfoTooltip text="Detalles del escenario si existe. Ej: 'Tarima modular de hasta 20m²'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                </div>
                                <FormField control={form.control} name="experienciaInvitado.conexionWifi" render={({ field }) => (<FormItem><FormLabel className="flex items-center">Conexión Wifi<InfoTooltip text="Detalles de la conexión a internet. Ej: 'Fibra simétrica de 1Gbps, soporta 500+ conexiones'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="experienciaInvitado.flow.guardarropa" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Tiene Guardarropa?</FormLabel></FormItem>)} />
                                    <FormField control={form.control} name="experienciaInvitado.flow.seguridadPropia" render={({ field }) => (<FormItem className="flex flex-row items-center gap-2 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">¿Tiene Seguridad Propia?</FormLabel></FormItem>)} />
                                </div>
                             </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                
             </Accordion>
          </form>
        </Form>
      </TooltipProvider>
      </main>
    </>
  );
}
    

    

