'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { ServiceOrder } from '@/types';
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
import { Badge } from '@/components/ui/badge';
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
import { CATERING_ITEMS } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function PesPage() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedOrders = localStorage.getItem('serviceOrders');
    
    if (!storedOrders || JSON.parse(storedOrders).length === 0) {
      // Create dummy data if no orders exist
      const dummyOS: ServiceOrder[] = [
        {
          id: `${Date.now()}-1`,
          serviceNumber: 'OS-2024-001',
          startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          client: 'Empresa Innovadora S.L.',
          tipoCliente: 'Empresa',
          pax: 150,
          status: 'Confirmado',
          space: 'Finca La Reunión',
          deliveryLocations: ['Salón Principal', 'Cocina Trasera'],
          contact: 'Ana Torres',
          phone: '611223344',
          finalClient: 'Tech Conference 2024',
          comercial: 'com1',
          comercialAsiste: true,
          comercialPhone: '612345678',
          comercialMail: 'comercial1@example.com',
          rrhhAsiste: false,
          respRRHH: '',
          respRRHHPhone: '',
          respRRHHMail: '',
          spaceContact: 'Luis García',
          spacePhone: '699887766',
          spaceMail: 'luis.garcia@example.com',
          respMetre: 'metre1',
          respMetrePhone: '622334455',
          respMetreMail: 'metre1@example.com',
          respPase: 'pase1',
          respPasePhone: '655555555',
          respPaseMail: 'pase1@example.com',
          respCocinaPase: 'cocinapase1',
          respCocinaPasePhone: '655555556',
          respCocinaPaseMail: 'cocinapase1@example.com',
          agencyPercentage: 10,
          spacePercentage: 5,
          facturacion: 25000,
          uniformity: 'uniform2',
          respCocinaCPR: 'cocinacpr1',
          respCocinaCPRPhone: '633445566',
          respCocinaCPRMail: 'cocinacpr1@example.com',
          plane: '',
          menu: '',
          dniList: '',
          sendTo: 'dest1',
          comments: 'Evento de presentación de producto. Necesitan buena iluminación y sonido.'
        },
        {
          id: `${Date.now()}-2`,
          serviceNumber: 'OS-2024-002',
          startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
          client: 'Particulares - Boda J&M',
          tipoCliente: 'Particular',
          pax: 80,
          status: 'Borrador',
          space: 'Restaurante El Mirador',
          deliveryLocations: ['Salón Mirador'],
          contact: 'Javier Martín',
          phone: '655443322',
          finalClient: '',
          comercial: 'com2',
          comercialAsiste: false,
          comercialPhone: '612345679',
          comercialMail: 'comercial2@example.com',
          rrhhAsiste: true,
          respRRHH: 'rrhh1',
          respRRHHPhone: '699999999',
          respRRHHMail: 'rrhh1@example.com',
          spaceContact: 'Elena Soler',
          spacePhone: '677889900',
          spaceMail: 'elena.soler@example.com',
          respMetre: 'metre2',
          respMetrePhone: '644556677',
          respMetreMail: 'metre2@example.com',
          respPase: 'pase2',
          respPasePhone: '655555557',
          respPaseMail: 'pase2@example.com',
          respCocinaPase: 'cocinapase2',
          respCocinaPasePhone: '655555558',
          respCocinaPaseMail: 'cocinapase2@example.com',
          agencyPercentage: 0,
          spacePercentage: 0,
          facturacion: 8000,
          uniformity: 'uniform1',
          respCocinaCPR: 'cocinacpr2',
          respCocinaCPRPhone: '655667788',
          respCocinaCPRMail: 'cocinacpr2@example.com',
          plane: '',
          menu: '',
          dniList: '',
          sendTo: '',
          comments: 'Boda íntima. Menú vegetariano para 10 invitados.'
        },
      ];
      localStorage.setItem('serviceOrders', JSON.stringify(dummyOS));
      
      const dummyMaterialOrders = [
        {
          id: `${Date.now()}-A`, osId: `${Date.now()}-1`, type: 'Almacén',
          items: [
            {...CATERING_ITEMS.find(i=> i.itemCode === 'TBL01')!, quantity: 20},
            {...CATERING_ITEMS.find(i=> i.itemCode === 'CHR01')!, quantity: 150}
          ],
          days: 3, total: (20*10 + 150*1.5)*3, contractNumber: 'OS-2024-001',
          status: 'Asignado',
          deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          deliverySpace: 'Finca La Reunión', deliveryLocation: 'Salón Principal'
        },
         {
          id: `${Date.now()}-B`, osId: `${Date.now()}-1`, type: 'Almacén',
          items: [
            {...CATERING_ITEMS.find(i=> i.itemCode === 'PLT01')!, quantity: 150},
            {...CATERING_ITEMS.find(i=> i.itemCode === 'PLT02')!, quantity: 150},
            {...CATERING_ITEMS.find(i=> i.itemCode === 'CUT01')!, quantity: 150},
          ],
          days: 3, total: (150*0.5 + 150*0.4 + 150*0.75)*3, contractNumber: 'OS-2024-001',
          status: 'En preparación',
          deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          deliverySpace: 'Finca La Reunión', deliveryLocation: 'Cocina Trasera'
        },
        {
          id: `${Date.now()}-C`, osId: `${Date.now()}-1`, type: 'Bodega',
          items: [
            {...CATERING_ITEMS.find(i=> i.itemCode === 'GLS01')!, quantity: 200},
            {...CATERING_ITEMS.find(i=> i.itemCode === 'GLS02')!, quantity: 200},
          ],
          days: 3, total: (200 * 0.4 + 200 * 0.3)*3, contractNumber: 'OS-2024-001',
          status: 'Listo',
          deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          deliverySpace: 'Finca La Reunión', deliveryLocation: 'Salón Principal'
        }
      ];
      localStorage.setItem('materialOrders', JSON.stringify(dummyMaterialOrders));
      setServiceOrders(dummyOS);
      toast({ title: 'Datos de prueba cargados', description: 'Se han cargado órdenes de servicio y pedidos de ejemplo.' });
    } else {
      setServiceOrders(JSON.parse(storedOrders));
    }
    setIsMounted(true);
  }, [toast]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    serviceOrders.forEach(os => {
      try {
        const month = format(new Date(os.startDate), 'yyyy-MM');
        months.add(month);
      } catch (e) {
        console.error(`Invalid start date for OS ${os.serviceNumber}: ${os.startDate}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [serviceOrders]);
  
  const filteredAndSortedOrders = useMemo(() => {
    const today = startOfToday();
    const filtered = serviceOrders.filter(os => {
      const searchMatch = searchTerm.trim() === '' || os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || os.client.toLowerCase().includes(searchTerm.toLowerCase());
      
      let monthMatch = true;
      if (selectedMonth !== 'all') {
        try {
          const osMonth = format(new Date(os.startDate), 'yyyy-MM');
          monthMatch = osMonth === selectedMonth;
        } catch (e) {
          monthMatch = false;
        }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              pastEventMatch = !isBefore(new Date(os.endDate), today);
          } catch (e) {
              pastEventMatch = true; // if date is invalid, better to show it
          }
      }

      return searchMatch && monthMatch && pastEventMatch;
    });

    return filtered.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());

  }, [serviceOrders, searchTerm, selectedMonth, showPastEvents]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    // Also delete associated material orders
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]');
    const updatedMaterialOrders = allMaterialOrders.filter((mo: any) => mo.osId !== orderToDelete);
    localStorage.setItem('materialOrders', JSON.stringify(updatedMaterialOrders));

    const updatedOrders = serviceOrders.filter(os => os.id !== orderToDelete);
    localStorage.setItem('serviceOrders', JSON.stringify(updatedOrders));
    setServiceOrders(updatedOrders);
    toast({ title: 'Orden eliminada', description: 'La orden de servicio y sus pedidos asociados han sido eliminados.' });
    setOrderToDelete(null);
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Previsión de Servicios..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold">Previsión de Servicios</h1>
          <Button asChild>
            <Link href="/os">
              <PlusCircle className="mr-2" />
              Nueva Orden
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Buscar por Nº Servicio o Cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filtrar por mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {availableMonths.map(month => (
                <SelectItem key={month} value={month}>
                  {format(new Date(`${month}-02`), 'MMMM yyyy', { locale: es })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
                <label htmlFor="show-past" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Mostrar eventos finalizados
                </label>
            </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Servicio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>PAX</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedOrders.length > 0 ? (
                filteredAndSortedOrders.map(os => (
                  <TableRow key={os.id} onClick={() => router.push(`/os?id=${os.id}`)} className="cursor-pointer">
                    <TableCell className="font-medium">{os.serviceNumber}</TableCell>
                    <TableCell>{os.client}</TableCell>
                    <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{format(new Date(os.endDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{os.pax}</TableCell>
                    <TableCell>
                      <Badge variant={os.status === 'Confirmado' ? 'default' : 'secondary'}>
                        {os.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/os?id=${os.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(os.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No hay órdenes de servicio que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la orden de servicio y todos sus pedidos de material asociados.
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
