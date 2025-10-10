
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Building, X, PlusCircle, Trash2 } from 'lucide-react';
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
    aforoMaximoCocktail: z.coerce.number().optional(),
    aforoMaximoBanquete: z.coerce.number().optional(),
    salas: z.array(salaSchema).optional(),
  }),
  logistica: z.object({
    accesoVehiculos: z.string().optional(),
    horarioMontajeDesmontaje: z.string().optional(),
    montacargas: z.boolean().default(false),
    dimensionesMontacargas: z.string().optional(),
    accesoServicioIndependiente: z.boolean().default(false),
    potenciaTotal: z.string().optional(),
    cuadrosElectricos: z.array(cuadroElectricoSchema).optional(),
    tomasAgua: z.array(z.string()).optional(),
    desagues: z.array(z.string()).optional(),
    tipoCocina: z.enum(['Cocina completa', 'Office de regeneración', 'Sin cocina']),
    equipamientoCocina: z.array(z.string()).optional(),
    potenciaElectricaCocina: z.string().optional(),
    tomasAguaCocina: z.boolean().default(false),
    desaguesCocina: z.boolean().default(false),
    extraccionHumos: z.boolean().default(false),
    descripcionOffice: z.string().optional(),
    zonaAlmacenaje: z.string().optional(),
    limitadorSonido: z.boolean().default(false),
    permiteMusicaExterior: z.boolean().default(false),
    politicaDecoracion: z.string().optional(),
    puntosAnclaje: z.boolean().default(false),
    metricasOperativas: z.object({
        dificultadMontaje: z.coerce.number().min(1).max(5).optional(),
        penalizacionPersonalMontaje: z.coerce.number().optional(),
        notasDificultadMontaje: z.string().optional(),
    }).optional(),
  }),
  evaluacionMICE: z.object({
    proveedorId: z.string().optional(),
    relacionComercial: z.enum(['Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación']),
    valoracionComercial: z.coerce.number().min(1).max(5).optional(),
    puntosFuertes: z.array(z.string()).optional(),
    puntosDebiles: z.array(z.string()).optional(),
    perfilClienteIdeal: z.string().optional(),
    argumentarioVentaRapido: z.array(z.string()).optional(),
    exclusividadMusica: z.boolean().default(false),
    exclusividadAudiovisuales: z.boolean().default(false),
    otrosProveedoresExclusivos: z.string().optional(),
    notasComerciales: z.string().optional(),
    resumenEjecutivoIA: z.string().optional(),
    valoracionOperaciones: z.coerce.number().min(1).max(5).optional(),
    factoresCriticosExito: z.array(z.string()).optional(),
    riesgosPotenciales: z.array(z.string()).optional(),
  }),
  experienciaInvitado: z.object({
    flow: z.object({
        accesoPrincipal: z.string().optional(),
        recorridoInvitado: z.string().optional(),
        aparcamiento: z.string().optional(),
        transportePublico: z.string().optional(),
        accesibilidadAsistentes: z.string().optional(),
        guardarropa: z.boolean().default(false),
        seguridadPropia: z.boolean().default(false),
    }),
    equipamientoAudiovisuales: z.string().optional(),
    pantalla: z.string().optional(),
    sistemaSonido: z.string().optional(),
    escenario: z.string().optional(),
    conexionWifi: z.string().optional(),
  }),
  multimedia: z.object({
    carpetaDRIVE: z.string().url("URL inválida.").or(z.literal("")).optional(),
    visitaVirtual: z.string().url("URL inválida.").or(z.literal("")).optional(),
  }).optional(),
  contactos: z.array(contactoSchema).optional(),
});


type EspacioFormValues = z.infer<typeof espacioFormSchema>;

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
            capacidades: { salas: [] },
            logistica: { tipoCocina: 'Sin cocina', metricasOperativas: { dificultadMontaje: 3 } },
            evaluacionMICE: { relacionComercial: 'Sin Relación', valoracionComercial: 3, valoracionOperaciones: 3 },
            experienciaInvitado: { flow: {}},
            multimedia: {},
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
                                    <FormItem className="col-span-2"><FormLabel>Nombre del Espacio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="identificacion.tipoDeEspacio" render={({ field }) => (
                                    <FormItem><FormLabel>Tipo de Espacio</FormLabel><MultiSelect options={TIPO_ESPACIO.map(t => ({label: t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/><FormMessage /></FormItem>
                                )} />
                             </div>
                             <FormField control={form.control} name="identificacion.descripcionCorta" render={({ field }) => (
                                <FormItem><FormLabel>Descripción Corta / Tagline</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                             <FormField control={form.control} name="identificacion.descripcionLarga" render={({ field }) => (
                                <FormItem><FormLabel>Descripción Larga (Marketing)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
                            )} />
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                 <FormField control={form.control} name="identificacion.calle" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.ciudad" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.provincia" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.codigoPostal" render={({ field }) => (<FormItem><FormLabel>C. Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                 <FormField control={form.control} name="identificacion.estilos" render={({ field }) => (<FormItem><FormLabel>Estilos</FormLabel><MultiSelect options={ESTILOS_ESPACIO.map(t => ({label: t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.tags" render={({ field }) => (<FormItem><FormLabel>Tags</FormLabel><MultiSelect options={TAGS_ESPACIO.map(t => ({label: t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem> )} />
                                 <FormField control={form.control} name="identificacion.idealPara" render={({ field }) => (<FormItem><FormLabel>Ideal Para</FormLabel><MultiSelect options={IDEAL_PARA.map(t => ({label: t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem> )} />
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
                                <FormField control={form.control} name="capacidades.aforoMaximoCocktail" render={({ field }) => ( <FormItem><FormLabel>Aforo Máx. Cocktail</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="capacidades.aforoMaximoBanquete" render={({ field }) => ( <FormItem><FormLabel>Aforo Máx. Banquete</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
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
                                    <FormItem><FormLabel>Cocina</FormLabel>
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
                                        <FormLabel>Nivel de Dificultad Montaje (1-5)</FormLabel>
                                        <FormControl>
                                            <Slider defaultValue={[field.value || 3]} value={[field.value || 3]} onValueChange={(value) => field.onChange(value[0])} max={5} min={1} step={1} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="logistica.metricasOperativas.penalizacionPersonalMontaje" render={({ field }) => (
                                    <FormItem><FormLabel>% Penalización Personal Montaje</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                 <FormField control={form.control} name="logistica.metricasOperativas.notasDificultadMontaje" render={({ field }) => (
                                    <FormItem><FormLabel>Notas sobre Dificultad Montaje</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
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
                                        <FormLabel>Relación Comercial</FormLabel>
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
             </Accordion>
          </form>
        </Form>
      </main>
    </>
  );
}

    