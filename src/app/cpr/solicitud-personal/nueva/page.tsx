
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import type { SolicitudPersonalCPR } from '@/types';
import { PARTIDAS_PRODUCCION } from '@/types';
import { Save, ArrowLeft, Calendar as CalendarIcon, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  fechaServicio: z.date({ required_error: "La fecha es obligatoria." }),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  partida: z.enum(PARTIDAS_PRODUCCION),
  categoria: z.string().min(1, "La categoría es obligatoria."),
  cantidad: z.coerce.number().min(1, "Debe solicitar al menos 1 persona."),
  motivo: z.string().min(5, "El motivo debe tener al menos 5 caracteres."),
});

type FormValues = z.infer<typeof formSchema>;

const categoriasComunes = ["Cocinero/a", "Ayudante de Cocina", "Pastelero/a", "Mozo/a Almacén"];

export default function NuevaSolicitudPersonalPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            horaInicio: '08:00',
            horaFin: '16:00',
            partida: 'FRIO',
            cantidad: 1,
            fechaServicio: new Date(),
        }
    });

    const onSubmit = (data: FormValues) => {
        if (!impersonatedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se puede crear la solicitud sin un usuario identificado.' });
            return;
        }

        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        
        for (let i = 0; i < data.cantidad; i++) {
            const newRequest: SolicitudPersonalCPR = {
                id: `REQ-CPR-${Date.now()}-${i}`,
                fechaSolicitud: new Date().toISOString(),
                solicitadoPor: impersonatedUser.nombre,
                ...data,
                cantidad: 1, // Each request is for 1 person
                fechaServicio: format(data.fechaServicio, 'yyyy-MM-dd'),
                estado: 'Pendiente',
            };
            allRequests.push(newRequest);
        }

        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));

        toast({ title: "Solicitud Enviada", description: `${data.cantidad} solicitud(es) de personal han sido enviadas a RRHH.`});
        router.push('/cpr/solicitud-personal');
    };

    return (
        <div>
            <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="flex items-center justify-end mb-6">
                        <Button type="submit"><Save className="mr-2"/> Enviar Solicitud a RRHH</Button>
                    </div>
                    
                    <Card>
                        <CardHeader><CardTitle>Detalles de la Necesidad</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="fechaServicio" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Fecha del Servicio</FormLabel>
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar 
                                                    mode="single" 
                                                    selected={field.value} 
                                                    onSelect={(date) => {
                                                        field.onChange(date);
                                                        setIsCalendarOpen(false);
                                                    }} 
                                                    initialFocus 
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="horaInicio" render={({ field }) => <FormItem><FormLabel>Hora Inicio</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                                <FormField control={form.control} name="horaFin" render={({ field }) => <FormItem><FormLabel>Hora Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                            </div>
                             <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="partida" render={({ field }) => (
                                    <FormItem><FormLabel>Partida</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{PARTIDAS_PRODUCCION.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name="categoria" render={({ field }) => (
                                    <FormItem><FormLabel>Categoría/Puesto</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{categoriasComunes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name="cantidad" render={({ field }) => (
                                    <FormItem><FormLabel>Nº de Personas</FormLabel><FormControl><Input type="number" {...field} min="1" /></FormControl><FormMessage/></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="motivo" render={({ field }) => (
                                <FormItem><FormLabel>Motivo de la Solicitud</FormLabel><FormControl><Textarea {...field} placeholder="Ej: Apoyo para producción evento OS-2024-123..."/></FormControl><FormMessage/></FormItem>
                            )} />
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    )
}
