
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Database, Users, ChevronRight, UserPlus } from 'lucide-react';
import type { Personal } from '@/types';
import { DEPARTAMENTOS_PERSONAL } from '@/types';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUpsertPersonal } from '@/hooks/use-data-queries';
import { PersonalPhotoUpload } from '@/app/(dashboard)/bd/personal/components/PersonalPhotoUpload';

export const personalFormSchema = z.object({
  id: z.string().min(1, 'El DNI es obligatorio').regex(/^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$/, 'DNI/NIE no válido'),
  matricula: z.string().optional().default(''),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido1: z.string().min(1, 'El primer apellido es obligatorio'),
  apellido2: z.string().optional().default(''),
  iniciales: z.string().optional(),
  departamento: z.string().min(1, 'El departamento es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  telefono: z.string().optional().default(''),
  email: z.string().email('Debe ser un email válido'),
  precioHora: z.coerce.number().min(0, 'El precio por hora no puede ser negativo'),
  fotoUrl: z.string().optional(),
});

type PersonalFormValues = z.infer<typeof personalFormSchema>;

export default function NuevoPersonalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const upsertPersonal = useUpsertPersonal();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: {
      id: '',
      matricula: '',
      nombre: '',
      apellido1: '',
      apellido2: '',
      iniciales: '',
      departamento: '',
      categoria: '',
      telefono: '',
      email: '',
      precioHora: 0,
      fotoUrl: '',
    },
  });

  async function onSubmit(data: PersonalFormValues) {
    try {
      const nombreCompleto = `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim();
      const nombreCompacto = `${data.nombre} ${data.apellido1}`.trim();
      const iniciales = data.iniciales || `${data.nombre[0]}${data.apellido1[0]}`.toUpperCase();

      await upsertPersonal.mutateAsync({
        ...data,
        nombreCompleto,
        nombreCompacto,
        iniciales,
        activo: true
      });

      toast({ description: 'Nuevo empleado añadido correctamente.' });
      router.push('/bd/personal');
    } catch (error: any) {
      console.error('Error creating personal:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el empleado: ' + error.message });
    }
  }

  return (
    <>
      <div className="sticky top-[88px] md:top-[96px] z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Nuevo Empleado</h1>
                <p className="text-xs text-muted-foreground font-medium">Asignación de identificador único (DNI)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/bd/personal')}>
                <X className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Cancelar</span>
              </Button>
              <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={upsertPersonal.isPending}>
                {upsertPersonal.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Empleado
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Columna Izquierda: Foto */}
              <div className="md:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Fotografía</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <FormField
                      control={form.control}
                      name="fotoUrl"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <PersonalPhotoUpload
                              value={field.value || ''}
                              onChange={field.onChange}
                              dni={form.watch('id')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                
                <Card className="bg-blue-50/30 border-blue-100">
                  <CardContent className="pt-6">
                    <p className="text-xs text-blue-600 leading-relaxed">
                      <strong>Nota sobre el DNI:</strong> El DNI será el identificador único del empleado en todas las áreas del sistema. Asegúrese de que es correcto antes de guardar.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Columna Derecha: Datos */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DNI / NIE (ID Único)</FormLabel>
                          <FormControl>
                            <Input placeholder="12345678X" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="matricula"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nº Matrícula (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="E-1234..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apellido1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primer Apellido</FormLabel>
                          <FormControl>
                            <Input placeholder="García" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apellido2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segundo Apellido</FormLabel>
                          <FormControl>
                            <Input placeholder="Pérez" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="600000000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="juan.garcia@ejemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Clasificación y Costos</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="departamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un departamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DEPARTAMENTOS_PERSONAL.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="categoria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría / Puesto</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Camarero, Cocinero..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="precioHora"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio por Hora (€)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="iniciales"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Iniciales (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="JG" {...field} maxLength={3} />
                          </FormControl>
                          <FormDescription>Se autogeneran si se dejan vacías.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
