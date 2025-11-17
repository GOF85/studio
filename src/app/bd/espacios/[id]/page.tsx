

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Building, Trash2 } from 'lucide-react';
import type { Espacio, ContactoEspacio, Sala } from '@/types';
import { TIPO_ESPACIO, ESTILOS_ESPACIO, TAGS_ESPACIO, IDEAL_PARA, type RelacionComercial } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const salaSchema = z.object({
  id: z.string(),
  nombreSala: z.string().min(1, 'El nombre es obligatorio'),
  aforoTeatro: z.coerce.number().optional().default(0),
  aforoEscuela: z.coerce.number().optional().default(0),
  aforoCabaret: z.coerce.number().optional().default(0),
  aforoCocktailSala: z.coerce.number().optional().default(0),
  esDiafana: z.boolean().default(false),
  tieneLuzNatural: z.boolean().default(false),
});

const contactoSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  cargo: z.string().optional().default(''),
  telefono: z.string().optional().default(''),
  email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
});

const espacioFormSchema = z.object({
  id: z.string(),
  identificacion: z.object({
    nombreEspacio: z.string().min(1, "El nombre es obligatorio"),
    tipoDeEspacio: z.array(z.string()).min(1, "Debe seleccionar al menos un tipo"),
    ciudad: z.string().min(1, "La ciudad es obligatoria"),
    provincia: z.string().min(1, "La provincia es obligatoria"),
    calle: z.string().min(1, "La calle es obligatoria"),
    codigoPostal: z.string().min(1, "El código postal es obligatorio"),
    estilos: z.array(z.string()).optional().default([]),
    tags: z.array(z.string()).optional().default([]),
    idealPara: z.array(z.string()).optional().default([]),
  }),
  capacidades: z.object({
    aforoMaximoCocktail: z.coerce.number().min(0).default(0),
    aforoMaximoBanquete: z.coerce.number().min(0).default(0),
    salas: z.array(salaSchema).optional().default([]),
  }),
  contactos: z.array(contactoSchema).optional().default([]),
  evaluacionMICE: z.object({
      relacionComercial: z.enum(['Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación']),
      exclusividadMusica: z.boolean().default(false),
      exclusividadAudiovisuales: z.boolean().default(false),
  }),
});

type EspacioFormValues = z.infer<typeof espacioFormSchema>;

export default function EditarEspacioPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<EspacioFormValues>({
    resolver: zodResolver(espacioFormSchema),
  });
  
  const { control, reset } = form;

  const { fields: salaFields, append: appendSala, remove: removeSala } = useFieldArray({ control, name: "capacidades.salas" });
  const { fields: contactoFields, append: appendContacto, remove: removeContacto } = useFieldArray({ control, name: "contactos" });


  useEffect(() => {
    const allItems = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
    const item = allItems.find(p => p.id === id);
    if (item) {
        // Ensure all optional fields have default values to prevent uncontrolled to controlled error
        const defaultEvaluacionMICE = {
            relacionComercial: 'Sin Relación' as RelacionComercial,
            exclusividadMusica: false,
            exclusividadAudiovisuales: false,
            ...item.evaluacionMICE,
        };

        const defaultCapacidades = {
            aforoMaximoCocktail: 0,
            aforoMaximoBanquete: 0,
            salas: [],
            ...item.capacidades,
        };
        
        const defaultIdentificacion = {
            nombreEspacio: '',
            tipoDeEspacio: [],
            ciudad: '',
            provincia: '',
            calle: '',
            codigoPostal: '',
            estilos: [],
            tags: [],
            idealPara: [],
            ...item.identificacion,
        }

        const dataToReset: EspacioFormValues = {
            id: item.id || '',
            identificacion: {
                nombreEspacio: defaultIdentificacion.nombreEspacio || '',
                tipoDeEspacio: defaultIdentificacion.tipoDeEspacio || [],
                ciudad: defaultIdentificacion.ciudad || '',
                provincia: defaultIdentificacion.provincia || '',
                calle: defaultIdentificacion.calle || '',
                codigoPostal: defaultIdentificacion.codigoPostal || '',
                estilos: defaultIdentificacion.estilos || [],
                tags: defaultIdentificacion.tags || [],
                idealPara: defaultIdentificacion.idealPara || [],
            },
            capacidades: {
                aforoMaximoCocktail: defaultCapacidades.aforoMaximoCocktail || 0,
                aforoMaximoBanquete: defaultCapacidades.aforoMaximoBanquete || 0,
                salas: (defaultCapacidades.salas || []).map(s => ({...s, nombreSala: s.nombreSala || ''})),
            },
            contactos: (item.contactos || []).map(c => ({
                id: c.id || '',
                nombre: c.nombre || '',
                cargo: c.cargo || '',
                telefono: c.telefono || '',
                email: c.email || '',
            })),
            evaluacionMICE: {
                relacionComercial: defaultEvaluacionMICE.relacionComercial,
                exclusividadMusica: defaultEvaluacionMICE.exclusividadMusica || false,
                exclusividadAudiovisuales: defaultEvaluacionMICE.exclusividadAudiovisuales || false,
            },
        };
        
        reset(dataToReset);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el espacio.' });
      router.push('/bd/espacios');
    }
  }, [id, reset, router, toast]);

  function onSubmit(data: EspacioFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
    const index = allItems.findIndex(p => p.id === id);

    if (index !== -1) {
      // Reconstruct the full object before saving
      const fullItem: Espacio = {
          ...allItems[index], // Keep old fields
          ...data, // Overwrite with new form data
      };
      allItems[index] = fullItem;
      localStorage.setItem('espacios', JSON.stringify(allItems));
      toast({ description: 'Espacio actualizado correctamente.' });
    }
    
    router.push('/bd/espacios');
    setIsLoading(false);
  }
  
  const handleDelete = () => {
    let allItems = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('espacios', JSON.stringify(updatedItems));
    toast({ title: 'Espacio eliminado' });
    router.push('/bd/espacios');
  };

  return (
    <>
      <main>
        <FormProvider {...form}>
          <form id="espacio-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Espacio</h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/bd/espacios')}> <X className="mr-2"/> Cancelar</Button>
                 <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/> Borrar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
                </Button>
              </div>
            </div>
            
             <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full space-y-4">
              <AccordionItem value="item-1">
                <Card>
                  <AccordionTrigger className="p-4"><CardTitle className="text-lg">Identificación y Localización</CardTitle></AccordionTrigger>
                  <AccordionContent className="p-4 pt-0">
                    <div className="space-y-4">
                      <FormField control={control} name="identificacion.nombreEspacio" render={({ field }) => (
                        <FormItem><FormLabel>Nombre del Espacio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={control} name="identificacion.tipoDeEspacio" render={({ field }) => (
                            <FormItem><FormLabel>Tipo de Espacio</FormLabel><MultiSelect options={TIPO_ESPACIO.map(t => ({label:t, value: t}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar tipo..."/><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="evaluacionMICE.relacionComercial" render={({ field }) => (
                           <FormItem><FormLabel>Relación Comercial</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Exclusividad">Exclusividad</SelectItem>
                                    <SelectItem value="Homologado Preferente">Homologado Preferente</SelectItem>
                                    <SelectItem value="Homologado">Homologado</SelectItem>
                                    <SelectItem value="Puntual">Puntual</SelectItem>
                                    <SelectItem value="Sin Relación">Sin Relación</SelectItem>
                                </SelectContent>
                            </Select>
                           </FormItem>
                        )} />
                      </div>
                      <div className="grid md:grid-cols-4 gap-4">
                        <FormField control={control} name="identificacion.calle" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={control} name="identificacion.ciudad" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={control} name="identificacion.codigoPostal" render={({ field }) => (<FormItem><FormLabel>Cód. Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={control} name="identificacion.provincia" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
              <AccordionItem value="item-2">
                 <Card>
                    <AccordionTrigger className="p-4"><CardTitle className="text-lg">Capacidades y Salas</CardTitle></AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                      <div className="grid md:grid-cols-2 gap-4">
                           <FormField control={control} name="capacidades.aforoMaximoCocktail" render={({ field }) => (<FormItem><FormLabel>Aforo Máximo Cocktail</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={control} name="capacidades.aforoMaximoBanquete" render={({ field }) => (<FormItem><FormLabel>Aforo Máximo Banquete</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    </AccordionContent>
                 </Card>
              </AccordionItem>
            </Accordion>
          </form>
        </FormProvider>
      </main>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el registro del espacio.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
