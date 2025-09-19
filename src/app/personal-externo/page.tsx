
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, ArrowLeft, Users, Phone, Building, UserPlus, Trash2 } from 'lucide-react';
import type { PersonalExternoOrder, ServiceOrder, Espacio, ComercialBriefing, ComercialBriefingItem } from '@/types';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { format, differenceInMinutes, parse } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

const calculateHours = (start?: string, end?: string) => {
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

export default function PersonalExternoPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [personalExternoOrders, setPersonalExternoOrders] = useState<PersonalExternoOrder[]>([]);
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

      const allOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
      const relatedOrders = allOrders.filter(order => order.osId === osId);
      setPersonalExternoOrders(relatedOrders);

      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      setBriefingItems(currentBriefing?.items || []);

    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return personalExternoOrders.reduce((sum, order) => {
        const horas = (new Date(`1970-01-01T${order.horaSalida}`).getTime() - new Date(`1970-01-01T${order.horaEntrada}`).getTime()) / (1000 * 60 * 60);
        return sum + (order.cantidad * order.precioHora * (horas > 0 ? horas : 0));
    }, 0);
  }, [personalExternoOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const updatedOrders = allOrders.filter((o) => o.id !== orderToDelete);
    localStorage.setItem('personalExternoOrders', JSON.stringify(updatedOrders));
    setPersonalExternoOrders(updatedOrders.filter((o) => o.osId === osId));
    
    toast({ title: 'Pedido de personal externo eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
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
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><UserPlus />Módulo de Personal Externo</h1>
                <div className="text-muted-foreground mt-2 space-y-1">
                    <p>OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
                     {serviceOrder.space && (
                        <p className="flex items-center gap-2">
                        <Building className="h-3 w-3" /> {serviceOrder.space} {spaceAddress && `(${spaceAddress})`}
                        </p>
                    )}
                    {serviceOrder.respMetre && (
                        <p className="flex items-center gap-2">
                            Resp. Metre: {serviceOrder.respMetre} 
                            {serviceOrder.respMetrePhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {serviceOrder.respMetrePhone}</span>}
                        </p>
                    )}
                </div>
            </div>
          <Button asChild>
            <Link href={`/personal-externo/pedido?osId=${osId}`}>
              <PlusCircle className="mr-2" />
              Nuevo Pedido
            </Link>
          </Button>
        </div>

        <Accordion type="single" collapsible className="w-full mb-8" >
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
                        <TableHead className="py-2 px-3">Fecha</TableHead>
                        <TableHead className="py-2 px-3">Descripción</TableHead>
                        <TableHead className="py-2 px-3">Asistentes</TableHead>
                        <TableHead className="py-2 px-3">Duración</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {briefingItems.length > 0 ? briefingItems.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="py-2 px-3">{format(new Date(item.fecha), 'dd/MM/yyyy')} {item.horaInicio}</TableCell>
                            <TableCell className="py-2 px-3">{item.descripcion}</TableCell>
                            <TableCell className="py-2 px-3">{item.asistentes}</TableCell>
                            <TableCell className="py-2 px-3">{calculateHours(item.horaInicio, item.horaFin).toFixed(2)}h</TableCell>
                        </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
                </AccordionContent>
            </Card>
            </AccordionItem>
        </Accordion>

        <Card>
            <CardHeader><CardTitle>Pedidos de Personal Externo</CardTitle></CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Horario</TableHead>
                            <TableHead>Coste Total Est.</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {personalExternoOrders.length > 0 ? (
                            personalExternoOrders.map(order => {
                                const horas = (new Date(`1970-01-01T${order.horaSalida}`).getTime() - new Date(`1970-01-01T${order.horaEntrada}`).getTime()) / (1000 * 60 * 60);
                                const totalCost = order.cantidad * order.precioHora * (horas > 0 ? horas : 0);
                                const providerName = JSON.parse(localStorage.getItem('proveedoresPersonal') || '[]').find((p:any) => p.id === order.proveedorId)?.nombreProveedor || 'N/A';
                                return (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{providerName}</TableCell>
                                    <TableCell>{order.categoria}</TableCell>
                                    <TableCell>{order.cantidad}</TableCell>
                                    <TableCell>{order.horaEntrada} - {order.horaSalida}</TableCell>
                                    <TableCell>{formatCurrency(totalCost)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No hay pedidos de personal externo para esta Orden de Servicio.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                {personalExternoOrders.length > 0 && (
                    <div className="flex justify-end mt-4 text-xl font-bold">
                        Importe Total: {formatCurrency(totalAmount)}
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de personal.
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
