'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Building } from 'lucide-react';
import type { Espacio } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const espacioFormSchema = z.object({
  id: z.string(),
  espacio: z.string().min(1, 'El nombre del espacio es obligatorio'),
  escaparateMICE: z.string().default(''),
  carpetaDRIVE: z.string().url().or(z.literal('')).optional(),
  calle: z.string().default(''),
  nombreContacto1: z.string().default(''),
  telefonoContacto1: z.string().default(''),
  emailContacto1: z.string().email().or(z.literal('')).optional(),
  canonEspacioPorcentaje: z.coerce.number().default(0),
  canonEspacioFijo: z.coerce.number().default(0),
  canonMcPorcentaje: z.coerce.number().default(0),
  canonMcFijo: z.coerce.number().default(0),
  comisionAlquilerMcPorcentaje: z.coerce.number().default(0),
  precioOrientativoAlquiler: z.string().default(''),
  horaLimiteCierre: z.string().default(''),
  aforoCocktail: z.coerce.number().default(0),
  aforoBanquete: z.coerce.number().default(0),
  auditorio: z.string().default(''),
  aforoAuditorio: z.coerce.number().default(0),
  zonaExterior: z.string().default(''),
  capacidadesPorSala: z.string().default(''),
  numeroDeSalas: z.coerce.number().default(0),
  tipoDeEspacio: z.string().default(''),
  tipoDeEventos: z.string().default(''),
  ciudad: z.string().default(''),
  directorio: z.string().default(''),
  descripcion: z.string().default(''),
  comentariosVarios: z.string().default(''),
  equipoAudiovisuales: z.string().default(''),
  cocina: z.string().default(''),
  accesibilidadAsistentes: z.string().default(''),
  pantalla: z.string().default(''),
  plato: z.string().default(''),
aparcamiento: z.string().default(''),
  accesoVehiculos: z.string().default(''),
  conexionWifi: z.string().default(''),
  homologacion: z.string().default(''),
  comentariosMarketing: z.string().default(''),
});

type EspacioFormValues = z.infer<typeof espacioFormSchema>;

const defaultValues: Partial<EspacioFormValues> = {
    espacio: '', escaparateMICE: '', carpetaDRIVE: '', calle: '', nombreContacto1: '',
    telefonoContacto1: '', emailContacto1: '', canonEspacioPorcentaje: 0, canonEspacioFijo: 0,
    canonMcPorcentaje: 0, canonMcFijo: 0, comisionAlquilerMcPorcentaje: 0, precioOrientativoAlquiler: '',
    horaLimiteCierre: '', aforoCocktail: 0, aforoBanquete: 0, auditorio: '', aforoAuditorio: 0,
    zonaExterior: '', capacidadesPorSala: '', numeroDeSalas: 0, tipoDeEspacio: '', tipoDeEventos: '',
    ciudad: '', directorio: '', descripcion: '', comentariosVarios: '', equipoAudiovisuales: '', cocina: '',
    accesibilidadAsistentes: '', pantalla: '', plato: '', accesoVehiculos: '', aparcamiento: '',
    conexionWifi: '', homologacion: '', comentariosMarketing: '',
};

export default function EspacioFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<EspacioFormValues>({
    resolver: zodResolver(espacioFormSchema),
    defaultValues,
  });

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
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: EspacioFormValues) {
    setIsLoading(true);

    let allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
    let message = '';
    
    if (isEditing) {
      const index = allEspacios.findIndex(e => e.id === id);
      if (index !== -1) {
        allEspacios[index] = data;
        message = 'Espacio actualizado correctamente.';
      }
    } else {
       const existing = allEspacios.find(e => e.espacio.toLowerCase() === data.espacio.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un espacio con este nombre.' });
            setIsLoading(false);
            return;
        }
      allEspacios.push(data);
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
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Building className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Espacio</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/espacios')}>Volver al listado</Button>
            <Button type="submit" form="espacio-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Espacio'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="espacio-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="espacio" render={({ field }) => (
                    <FormItem><FormLabel>Espacio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ciudad" render={({ field }) => (
                    <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="calle" render={({ field }) => (
                    <FormItem><FormLabel>Calle</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="tipoDeEspacio" render={({ field }) => (
                    <FormItem><FormLabel>Tipo de espacio</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="tipoDeEventos" render={({ field }) => (
                    <FormItem><FormLabel>Tipo de eventos</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="directorio" render={({ field }) => (
                    <FormItem><FormLabel>Directorio</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                 <FormField control={form.control} name="descripcion" render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3"><FormLabel>Descripción</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
                )} />
                 <FormField control={form.control} name="comentariosMarketing" render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3"><FormLabel>Comentarios Marketing</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
                )} />
              </CardContent>
            </Card>

            <Accordion type="multiple" defaultValue={['contacto', 'capacidades', 'canones', 'detalles', 'equipamiento']} className="w-full space-y-4">
                 <AccordionItem value="contacto">
                    <Card>
                        <AccordionTrigger className="p-6">
                            <h3 className="text-lg font-semibold">Contacto y Enlaces</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-0">
                                <FormField control={form.control} name="nombreContacto1" render={({ field }) => (
                                    <FormItem><FormLabel>Nombre contacto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="telefonoContacto1" render={({ field }) => (
                                    <FormItem><FormLabel>Teléfono contacto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="emailContacto1" render={({ field }) => (
                                    <FormItem><FormLabel>Email contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="escaparateMICE" render={({ field }) => (
                                    <FormItem><FormLabel>Escaparate MICE</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="carpetaDRIVE" render={({ field }) => (
                                    <FormItem className="lg:col-span-2"><FormLabel>Carpeta DRIVE</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>

                <AccordionItem value="capacidades">
                    <Card>
                        <AccordionTrigger className="p-6">
                            <h3 className="text-lg font-semibold">Capacidades y Aforos</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                             <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-0">
                                <FormField control={form.control} name="aforoCocktail" render={({ field }) => (
                                    <FormItem><FormLabel>Aforo Cocktail</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="aforoBanquete" render={({ field }) => (
                                    <FormItem><FormLabel>Aforo Banquete</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="numeroDeSalas" render={({ field }) => (
                                    <FormItem><FormLabel>Nº de Salas</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="auditorio" render={({ field }) => (
                                    <FormItem><FormLabel>Auditorio</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                 <FormField control={form.control} name="aforoAuditorio" render={({ field }) => (
                                    <FormItem><FormLabel>Aforo Auditorio</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="zonaExterior" render={({ field }) => (
                                    <FormItem><FormLabel>Zona Exterior</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="capacidadesPorSala" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Capacidades por Sala</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>

                 <AccordionItem value="canones">
                    <Card>
                        <AccordionTrigger className="p-6">
                            <h3 className="text-lg font-semibold">Información Financiera</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                             <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-0">
                                <FormField control={form.control} name="canonEspacioPorcentaje" render={({ field }) => (
                                    <FormItem><FormLabel>Canon espacio (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="canonEspacioFijo" render={({ field }) => (
                                    <FormItem><FormLabel>Canon fijo espacio (€)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                 <FormField control={form.control} name="precioOrientativoAlquiler" render={({ field }) => (
                                    <FormItem><FormLabel>Precio orientativo alquiler</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="canonMcPorcentaje" render={({ field }) => (
                                    <FormItem><FormLabel>Canon MC (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="canonMcFijo" render={({ field }) => (
                                    <FormItem><FormLabel>Canon fijo MC (€)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="comisionAlquilerMcPorcentaje" render={({ field }) => (
                                    <FormItem><FormLabel>Comisión alquiler MC (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                )} />
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>

                <AccordionItem value="equipamiento">
                    <Card>
                        <AccordionTrigger className="p-6">
                            <h3 className="text-lg font-semibold">Equipamiento y Servicios</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-0">
                                <FormField control={form.control} name="equipoAudiovisuales" render={({ field }) => (
                                    <FormItem><FormLabel>Equipo Audiovisuales</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="pantalla" render={({ field }) => (
                                    <FormItem><FormLabel>Pantalla</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                 <FormField control={form.control} name="plato" render={({ field }) => (
                                    <FormItem><FormLabel>Plató</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                 <FormField control={form.control} name="conexionWifi" render={({ field }) => (
                                    <FormItem><FormLabel>Conexión Wifi</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="cocina" render={({ field }) => (
                                    <FormItem><FormLabel>Cocina</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="aparcamiento" render={({ field }) => (
                                    <FormItem><FormLabel>Aparcamiento</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="accesoVehiculos" render={({ field }) => (
                                    <FormItem><FormLabel>Acceso vehículos</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="accesibilidadAsistentes" render={({ field }) => (
                                    <FormItem><FormLabel>Accesibilidad asistentes</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                
                 <AccordionItem value="detalles">
                    <Card>
                        <AccordionTrigger className="p-6">
                            <h3 className="text-lg font-semibold">Detalles Adicionales</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                             <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-0">
                                <FormField control={form.control} name="horaLimiteCierre" render={({ field }) => (
                                    <FormItem><FormLabel>Hora límite de cierre</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="homologacion" render={({ field }) => (
                                    <FormItem><FormLabel>Homologación</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                                <div></div>
                                 <FormField control={form.control} name="comentariosVarios" render={({ field }) => (
                                    <FormItem className="md:col-span-2 lg:col-span-3"><FormLabel>Comentarios Varios</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
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
