'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, MenajeDB } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';

// Placeholder schema based on src/types/index.ts
const recetaFormSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcionComercial: z.string().optional(),
  responsableEscandallo: z.string().optional(),
  categoria: z.string().optional(),
  partidaProduccion: z.enum(['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION']),
  estacionalidad: z.enum(['INVIERNO', 'VERANO', 'MIXTO']),
  tipoDieta: z.enum(['VEGETARIANO', 'VEGANO', 'AMBOS', 'NINGUNO']),
  gramajeTotal: z.coerce.number().optional().default(0),
  porcentajeCosteProduccion: z.coerce.number().optional().default(0),
});

type RecetaFormValues = z.infer<typeof recetaFormSchema>;

export default function RecetaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nueva';
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<RecetaFormValues>({
    resolver: zodResolver(recetaFormSchema),
    defaultValues: {
      nombre: '',
      descripcionComercial: '',
      responsableEscandallo: '',
      categoria: '',
      partidaProduccion: 'FRIO',
      estacionalidad: 'MIXTO',
      tipoDieta: 'NINGUNO',
      gramajeTotal: 0,
      porcentajeCosteProduccion: 0,
    }
  });

  useEffect(() => {
    // Logic to load recipe data for editing will go here
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: RecetaFormValues) {
    setIsLoading(true);
    toast({ title: "Funcionalidad en desarrollo", description: "La creación de recetas se implementará en el siguiente paso." });
    setTimeout(() => {
        setIsLoading(false);
    }, 1000)
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="receta-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <BookHeart className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nueva'} Receta</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book')}> <X className="mr-2"/> Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Receta'}</span>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="nombre" render={({ field }) => (
                            <FormItem><FormLabel>Nombre de la Receta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="responsableEscandallo" render={({ field }) => (
                            <FormItem><FormLabel>Responsable del Escandallo</FormLabel><FormControl><Input {...field} placeholder="Nombre del cocinero" /></FormControl></FormItem>
                        )} />
                    </div>
                     <FormField control={form.control} name="descripcionComercial" render={({ field }) => (
                        <FormItem><FormLabel>Descripción Comercial</FormLabel><FormControl><Textarea {...field} placeholder="Descripción para la carta..." /></FormControl></FormItem>
                     )} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Clasificación y Atributos</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                     <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input {...field} placeholder="Ej: Entrante, Pescado..." /></FormControl></FormItem>
                    )} />
                     <FormField control={form.control} name="partidaProduccion" render={({ field }) => (
                        <FormItem><FormLabel>Partida de Producción</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="FRIO">Frío</SelectItem>
                                    <SelectItem value="CALIENTE">Caliente</SelectItem>
                                    <SelectItem value="PASTELERIA">Pastelería</SelectItem>
                                    <SelectItem value="EXPEDICION">Expedición</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="estacionalidad" render={({ field }) => (
                        <FormItem><FormLabel>Estacionalidad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="INVIERNO">Invierno</SelectItem>
                                    <SelectItem value="VERANO">Verano</SelectItem>
                                    <SelectItem value="MIXTO">Mixto</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="tipoDieta" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de Dieta</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="VEGETARIANO">Vegetariano</SelectItem>
                                    <SelectItem value="VEGANO">Vegano</SelectItem>
                                    <SelectItem value="AMBOS">Ambos</SelectItem>
                                    <SelectItem value="NINGUNO">Ninguno</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Utensils />Elaboraciones</CardTitle>
                    <CardDescription>Añade los componentes de la receta. Puedes arrastrar y soltar para reordenarlos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md min-h-[10rem] bg-muted/30 flex items-center justify-center">
                        <p className="text-muted-foreground">La gestión de elaboraciones se implementará aquí.</p>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><GlassWater />Menaje Asociado</CardTitle>
                    <CardDescription>Define el menaje necesario para servir esta receta.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-md min-h-[10rem] bg-muted/30 flex items-center justify-center">
                        <p className="text-muted-foreground">La gestión de menaje se implementará aquí.</p>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Percent />Costes y Precios</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormField control={form.control} name="gramajeTotal" render={({ field }) => (
                        <FormItem><FormLabel>Gramaje Total (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormItem>
                        <FormLabel>Coste Materia Prima</FormLabel>
                        <Input readOnly value="0,00 €" className="font-bold" />
                    </FormItem>
                    <FormField control={form.control} name="porcentajeCosteProduccion" render={({ field }) => (
                        <FormItem><FormLabel>% Coste Producción</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormItem>
                        <FormLabel>Precio Venta Rec.</FormLabel>
                        <Input readOnly value="0,00 €" className="font-bold text-primary" />
                    </FormItem>
                </CardContent>
                <CardFooter>
                     <div className="border rounded-md p-4 w-full bg-muted/30">
                        <h4 className="font-semibold mb-2 flex items-center gap-2"><Sprout/>Alérgenos de la Receta</h4>
                        <p className="text-muted-foreground">Los alérgenos se mostrarán aquí automáticamente.</p>
                     </div>
                </CardFooter>
            </Card>

          </form>
        </Form>
      </main>
    </>
  );
}
