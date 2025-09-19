'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Users, Phone, Building } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder, Espacio, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { differenceInMinutes, parse, format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    try {
        const startTime = parse(start, 'HH:mm', new Date());
        const endTime = parse(end, 'HH:mm', new Date());
        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        return 0;
    }
}

export default function PersonalMicePage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [personalMiceOrders, setPersonalMiceOrders] = useState<PersonalMiceOrder[]>([]);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  useEffect(() => {
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);

      if (currentOS?.space) {
        const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
        const currentSpace = allEspacios.find(e => e.espacio === currentOS.space);
        setSpaceAddress(currentSpace?.calle || '');
      }

      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      setBriefingItems(currentBriefing?.items || []);

      const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
      const relatedOrders = allOrders.filter(order => order.osId === osId);
      setPersonalMiceOrders(relatedOrders);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return personalMiceOrders.reduce((sum, order) => {
        const hours = calculateHours(order.horaEntrada, order.horaSalida);
        return sum + (hours * order.precioHora);
    }, 0);
  }, [personalMiceOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
    const updatedOrders = allOrders.filter((o: PersonalMiceOrder) => o.id !== orderToDelete);
    localStorage.setItem('personalMiceOrders', JSON.stringify(updatedOrders));
    setPersonalMiceOrders(updatedOrders.filter((o: PersonalMiceOrder) => o.osId === osId));
    
    toast({ title: 'Asignación de personal eliminada' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal MICE..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver a la OS
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Módulo de Personal MICE</h1>
                <div className="text-muted-foreground mt-2 space-y-1">
                  <p>OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
                  {serviceOrder.space && (
                    <p className="flex items-center gap-2">
                      <Building className="h-3 w-3" /> {serviceOrder.space} {spaceAddress && `(${spaceAddress})`}
                    </p>
                  )}
                </div>
            </div>
          <Button asChild>
            <Link href={`/personal-mice/asignacion?osId=${osId}`}>
              <PlusCircle className="mr-2" />
              Nueva Asignación
            </Link>
          </Button>
        </div>
        
        {briefingItems.length > 0 && (
          <Accordion type="single" collapsible className="w-full mb-8">
            <AccordionItem value="item-1">
              <Card>
                <AccordionTrigger className="p-6">
                  <h3 className="text-xl font-semibold">Servicios del Evento</h3>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="py-2">Fecha</TableHead>
                          <TableHead className="py-2">Descripción</TableHead>
                          <TableHead className="py-2">Asistentes</TableHead>
                          <TableHead className="py-2">Duración</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {briefingItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="py-2">{format(new Date(item.fecha), 'dd/MM/yyyy')} {item.horaInicio}</TableCell>
                            <TableCell className="py-2">{item.descripcion}</TableCell>
                            <TableCell className="py-2">{item.asistentes}</TableCell>
                            <TableCell className="py-2">{calculateHours(item.horaInicio, item.horaFin).toFixed(2)}h</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        )}

        <Card>
            <CardHeader><CardTitle>Personal Asignado</CardTitle></CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Centro Coste</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Tipo Servicio</TableHead>
                            <TableHead>Horas Plan.</TableHead>
                            <TableHead>Total Plan.</TableHead>
                            <TableHead>Horas Real</TableHead>
                            <TableHead>Total Real</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {personalMiceOrders.length > 0 ? (
                            personalMiceOrders.map(order => {
                                const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
                                const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
                                const plannedTotal = plannedHours * order.precioHora;
                                const realTotal = realHours * order.precioHora;

                                return (
                                <TableRow key={order.id}>
                                    <TableCell>{order.centroCoste}</TableCell>
                                    <TableCell className="font-medium">{order.nombre}</TableCell>
                                    <TableCell>{order.tipoServicio}</TableCell>
                                    <TableCell>{plannedHours.toFixed(2)}h</TableCell>
                                    <TableCell>{formatCurrency(plannedTotal)}</TableCell>
                                    <TableCell>{realHours.toFixed(2)}h</TableCell>
                                    <TableCell>{formatCurrency(realTotal)}</TableCell>
                                    <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Abrir menú</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => router.push(`/personal-mice/asignacion?osId=${osId}&orderId=${order.id}`)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                        </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                No hay personal asignado para esta Orden de Servicio.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                {personalMiceOrders.length > 0 && (
                    <div className="flex justify-end mt-4 text-xl font-bold">
                        Coste Total Planificado: {formatCurrency(totalAmount)}
                    </div>
                )}
            </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la asignación de personal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
