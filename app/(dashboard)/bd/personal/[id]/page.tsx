
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserCog, Archive, RefreshCw, Database, Users, ChevronRight } from 'lucide-react';
import type { Personal } from '@/types';
import { DEPARTAMENTOS_PERSONAL } from '@/types';
import { personalFormSchema } from '@/app/(dashboard)/bd/personal/nuevo/page';
import { usePersonalItem, useUpsertPersonal, useArchivePersonal, useRestorePersonal } from '@/hooks/use-data-queries';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { PersonalPhotoUpload } from '@/app/(dashboard)/bd/personal/components/PersonalPhotoUpload';

type PersonalFormValues = z.infer<typeof personalFormSchema>;

const defaultFormValues: PersonalFormValues = {
  id: '',
  matricula: '',
  nombre: '',
  apellido1: '',
  apellido2: '',
  telefono: '',
  iniciales: '',
  email: '',
  precioHora: 0,
  departamento: '',
  categoria: '',
  fotoUrl: '',
};

export default function EditarPersonalPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const idValue = (params.id as string) || '';

  const { data: personal, isLoading: isLoadingPersonal } = usePersonalItem(idValue);
  const upsertPersonal = useUpsertPersonal();
  const archivePersonal = useArchivePersonal();
  const restorePersonal = useRestorePersonal();

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (personal) {
      form.reset({
        ...defaultFormValues,
        id: personal.id,
        matricula: personal.matricula || '',
        nombre: personal.nombre,
        apellido1: personal.apellido1,
        apellido2: personal.apellido2 || '',
        telefono: personal.telefono || '',
        email: personal.email || '',
        iniciales: personal.iniciales || '',
        precioHora: personal.precioHora || 0,
        departamento: personal.departamento,
        categoria: personal.categoria,
        fotoUrl: personal.fotoUrl || '',
      });
    }
  }, [personal, form]);

  async function onSubmit(data: PersonalFormValues) {
    try {
      const nombreCompleto = `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim();
      const nombreCompacto = `${data.nombre} ${data.apellido1}`.trim();
      const iniciales = data.nombre[0] && data.apellido1[0] 
        ? `${data.nombre[0]}${data.apellido1[0]}`.toUpperCase()
        : data.iniciales || '';

      await upsertPersonal.mutateAsync({
        ...data,
        nombreCompleto,
        nombreCompacto,
        iniciales,
        activo: personal?.activo ?? true
      });

      toast({ description: 'Empleado actualizado correctamente.' });
      router.push('/bd/personal');
    } catch (error: any) {
      console.error('Error updating personal:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el empleado: ' + error.message });
    }
  }

  const handleArchive = async () => {
    try {
      await archivePersonal.mutateAsync(idValue);
      toast({ title: 'Empleado archivado', description: 'El empleado ha sido movido a la sección de archivados.' });
      router.push('/bd/personal');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleRestore = async () => {
    try {
      await restorePersonal.mutateAsync(idValue);
      toast({ title: 'Empleado restaurado', description: 'El empleado vuelve a estar activo.' });
      router.refresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (isLoadingPersonal) return <LoadingSkeleton />;

  return (
    <>
      <div className="sticky top-[88px] md:top-[96px] z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Editar Personal</h1>
                <p className="text-xs text-muted-foreground font-medium">
                  {personal?.nombreCompleto || 'Cargando...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/bd/personal')}>
                <X className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Cancelar</span>
              </Button>
              <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={upsertPersonal.isPending}>
                {upsertPersonal.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Columna Izquierda: Foto y Estado */}
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
                              dni={form.getValues('id')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className={personal?.activo ? 'border-emerald-200 bg-emerald-50/10' : 'border-amber-200 bg-amber-50/10'}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      Estado del Empleado
                      <span className={`h-2 w-2 rounded-full ${personal?.activo ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {personal?.activo 
                        ? 'Este empleado está activo en el sistema.' 
                        : 'Este empleado está archivado y no aparece en las listas de selección.'}
                    </p>
                    {personal?.activo ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => setShowArchiveConfirm(true)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archivar Personal
                      </Button>
                    ) : (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={handleRestore}
                        disabled={restorePersonal.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${restorePersonal.isPending ? 'animate-spin' : ''}`} />
                        Restaurar Personal
                      </Button>
                    )}
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
                            <Input {...field} disabled />
                          </FormControl>
                          <FormDescription>El DNI no se puede editar por seguridad.</FormDescription>
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
                            <Input {...field} />
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
                            <Input {...field} />
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
                            <Input {...field} />
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
                            <Input type="tel" {...field} />
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
                            <Input type="email" placeholder="email@ejemplo.com" {...field} />
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
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                            key={field.value || 'empty'}
                          >
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
                          <FormLabel>Iniciales</FormLabel>
                          <FormControl>
                            <Input {...field} maxLength={3} />
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

      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar a {personal?.nombreCompacto}?</AlertDialogTitle>
            <AlertDialogDescription>
              El empleado dejará de aparecer en la lista de personal activo y en los selectores de asignación.
              Sus datos e historial se conservarán y podrá ser restaurado en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-amber-600 hover:bg-amber-700">
              Confirmar Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
