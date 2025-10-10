

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Building, X, PlusCircle, Trash2, Info } from 'lucide-react';
import type { Espacio, RelacionComercial } from '@/types';
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

const salaSchema = z.object({
  id: z.string(),
  nombreSala: z.string().min(1, "Nombre es obligatorio"),
  m2: z.coerce.number().optional(),
  dimensiones: z.string().optional(),
  alturaMax: z.coerce.number().optional(),
  alturaMin: z.coerce.number().optional(),
  aforoTeatro: z.coerce.number().optional(),
  aforoEscuela: z.coerce.number().optional(),
  aforoCabaret: z.coerce.number().optional(),
  aforoCocktailSala: z.coerce.number().optional(),
  esDiafana: z.boolean().default(false),
  tieneLuzNatural: z.boolean().default(false),
});

const contactoSchema = z.object({
    id: z.string(),
    nombre: z.string().min(1, "Nombre es obligatorio"),
    cargo: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email("Email inválido").or(z.literal('')),
});

const cuadroElectricoSchema = z.object({
    id: z.string(),
    ubicacion: z.string().min(1, "Ubicación requerida"),
    potencia: z.string(),
});


export const espacioFormSchema = z.object({
  id: z.string(),
  identificacion: z.object({
    nombreEspacio: z.string().min(1, 'El nombre es obligatorio'),
    tipoDeEspacio: z.array(z.string()).min(1, "Selecciona al menos un tipo"),
    descripcionCorta: z.string().optional(),
    descripcionLarga: z.string().optional(),
    ciudad: z.string().min(1, "La ciudad es obligatoria"),
    provincia: z.string().min(1, "La provincia es obligatoria"),
    calle: z.string().min(1, "La calle es obligatoria"),
    codigoPostal: z.string().min(1, "El C.P. es obligatorio"),
    zona: z.string().optional(),
    estilos: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    idealPara: z.array(z.string()).optional(),
  }),
  capacidades: z.object({
    aforoMaximoCocktail: z.coerce.number().optional().default(0),
    aforoMaximoBanquete: z.coerce.number().optional().default(0),
    salas: z.array(salaSchema).optional(),
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
    carpetaDRIVE: z.string().url("URL inválida.").or(z.literal("")).optional().default(''),
    visitaVirtual: z.string().url("URL inválida.").or(z.literal("")).optional().default(''),
  }).optional(),
  contactos: z.array(contactoSchema).optional().default([]),
});


type EspacioFormValues = z.infer<typeof espacioFormSchema>;

const RELACION_COMERCIAL_OPCIONES: RelacionComercial[] = ['Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación'];


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


export default function EspacioFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<EspacioFormValues>({
    resolver: zodResolver(espacioFormSchema),
    defaultValues: {
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
      multimedia: { carpetaDRIVE: '', visitaVirtual: '' },
      contactos: [],
    },
  });

  const { fields: salasFields, append: appendSala, remove: removeSala } = useFieldArray({ control: form.control, name: "capacidades.salas" });
  const { fields: contactosFields, append: appendContacto, remove: removeContacto } = useFieldArray({ control: form.control, name: "contactos" });
  const { fields: cuadrosFields, append: appendCuadro, remove: removeCuadro } = useFieldArray({ control: form.control, name: "logistica.cuadrosElectricos" });

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
            id: Date.now().toString(),
            identificacion: { nombreEspacio: '', tipoDeEspacio: [], ciudad: '', provincia: 'Madrid', calle: '', codigoPostal: '' },
            capacidades: { salas: [], aforoMaximoBanquete: 0, aforoMaximoCocktail: 0 },
            logistica: { tipoCocina: 'Sin cocina', metricasOperativas: { dificultadMontaje: 3, penalizacionPersonalMontaje: 0 } },
            evaluacionMICE: { relacionComercial: 'Sin Relación', valoracionComercial: 3, valoracionOperaciones: 3 },
            experienciaInvitado: { flow: {}},
            multimedia: { carpetaDRIVE: '', visitaVirtual: '' },
            contactos: [],
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
                                 <FormField control={form.control} name="identificacion.ciudad" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.provincia" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.codigoPostal" render={({ field }) => (<FormItem><FormLabel>C. Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
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
                        <AccordionTrigger className="p-4"><CardTitle>Contactos y Multimedia</CardTitle></AccordionTrigger>
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
                                <Button type="button" variant="outline" size="sm" onClick={() => appendSala({id: Date.now().toString(), nombreSala: '', esDiafana: true, tieneLuzNatural: true})}><PlusCircle className="mr-2"/>Añadir Sala</Button>
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
                                                <Slider defaultValue={[field.value || 3]} value={[field.value || 3]} onValueChange={(value) => field.onChange(value[0])} max={5} min={1} step={1} />
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
                                    <FormItem>
                                        <FormLabel className="flex items-center">Relación Comercial<InfoTooltip text="Define nuestra relación contractual con el venue. Clave para la priorización comercial."/></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {RELACION_COMERCIAL_OPCIONES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                             </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="item-5">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle>Experiencia del Invitado</CardTitle></AccordionTrigger>
                        <AccordionContent>
                             <CardContent className="space-y-4 pt-2">
                                <FormField control={form.control} name="experienciaInvitado.flow.accesoPrincipal" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center">Acceso Principal<InfoTooltip text="Cómo acceden los invitados. Ej: 'Recepción del hotel', 'Entrada directa desde la calle'."/></FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
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

    