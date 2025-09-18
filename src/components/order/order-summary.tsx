'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingCart, Trash2, Minus, Plus, Calendar as CalendarIcon, FilePlus } from 'lucide-react';
import { format } from "date-fns";
import { es } from 'date-fns/locale';

import type { OrderItem, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { ScrollArea } from '../ui/scroll-area';


interface OrderSummaryProps {
  items: OrderItem[];
  onUpdateQuantity: (itemCode: string, quantity: number) => void;
  onRemoveItem: (itemCode: string) => void;
  onSubmitOrder: (finalOrder: { items: OrderItem[], days: number, total: number, contractNumber: string, deliveryDate?: string, deliverySpace?: string, deliveryLocation?: string }) => void;
  onClearOrder: () => void;
  isEditing?: boolean;
  serviceOrder: ServiceOrder | null;
  onAddLocation: (newLocation: string) => void;
}

function isValidHttpUrl(string: string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

export function OrderSummary({ items, onUpdateQuantity, onRemoveItem, onSubmitOrder, onClearOrder, isEditing = false, serviceOrder, onAddLocation }: OrderSummaryProps) {
  const [rentalDays, setRentalDays] = useState(1);
  const [isReviewOpen, setReviewOpen] = useState(false);
  const [contractNumber, setContractNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [deliverySpace, setDeliverySpace] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (serviceOrder) {
      setContractNumber(serviceOrder.serviceNumber || '');
      setDeliverySpace(serviceOrder.space || '');
      if (serviceOrder.startDate) {
        setDeliveryDate(new Date(serviceOrder.startDate));
      }
    }
  }, [serviceOrder]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  const itemsTotal = subtotal * rentalDays;
  const total = itemsTotal;

  const handleAddNewLocation = () => {
    if (newLocation.trim()) {
      onAddLocation(newLocation.trim());
      setDeliveryLocation(newLocation.trim());
      setNewLocation('');
      setIsAddingLocation(false);
    }
  }

  const handleSubmit = () => {
    if (!contractNumber) {
        toast({ variant: 'destructive', title: 'Error', description: 'El Nº de Contrato (Nº de Servicio de la OS) es obligatorio.' });
        return;
    }
    onSubmitOrder({
      items,
      days: rentalDays,
      total,
      contractNumber,
      deliveryDate: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : undefined,
      deliverySpace,
      deliveryLocation,
    });
    setReviewOpen(false);
  };
  
  return (
    <Card className="sticky top-24 h-[calc(100vh-7rem)] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-headline">Tu Pedido</CardTitle>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearOrder} aria-label="Vaciar pedido">
            <Trash2 className="h-4 w-4 mr-1" />
            Vaciar
          </Button>
        )}
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
              <ShoppingCart className="h-12 w-12 mb-4" />
              <p className="font-medium">Tu cesta está vacía</p>
              <p className="text-sm">Añade artículos desde el catálogo para empezar.</p>
            </div>
          ) : (
              <ul className="space-y-4">
                {items.map((item) => {
                  const imageUrl = isValidHttpUrl(item.imageUrl) ? item.imageUrl : `https://picsum.photos/seed/${item.itemCode}/400/300`;
                  return (
                  <li key={item.itemCode} className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                      <Image src={imageUrl} alt={item.description} fill className="object-cover" data-ai-hint={item.imageHint}/>
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium leading-tight">{item.description}</p>
                      <p className="text-sm text-muted-foreground">{item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/día</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.itemCode, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                      <Input type="number" value={item.quantity} onChange={(e) => onUpdateQuantity(item.itemCode, parseInt(e.target.value) || 0)} className="h-7 w-12 text-center px-1" />
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.itemCode, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </li>
                )})}
              </ul>
          )}
        </CardContent>
      </ScrollArea>
      {items.length > 0 && (
          <div className="p-6 pt-0">
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="rental-days" className="flex-shrink-0">Días de alquiler:</Label>
                <Input
                  id="rental-days"
                  type="number"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-24 ml-auto"
                />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} artículos):</span>
                <span>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Días de alquiler:</span>
                <span>x{rentalDays}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total:</span>
                <span>{total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>
          </div>
        )}
      <CardFooter>
        <Dialog open={isReviewOpen} onOpenChange={setReviewOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg" disabled={items.length === 0}>
              {isEditing ? 'Actualizar Pedido' : 'Guardar Pedido'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Actualizar Pedido de Material' : 'Guardar Pedido de Material'}</DialogTitle>
              <DialogDescription>
                Revisa los detalles y confirma para guardar el pedido en la Orden de Servicio.
              </DialogDescription>
            </DialogHeader>
             <div className="space-y-4 py-4">
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {items.map(item => (
                        <li key={item.itemCode} className="flex justify-between items-center text-sm">
                            <span>{item.quantity} x {item.description}</span>
                            <span>{(item.quantity * item.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                        </li>
                    ))}
                </ul>
                <Separator />
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></div>
                    <div className="flex justify-between"><span>Días de alquiler:</span> <span>x{rentalDays}</span></div>
                    <div className="flex justify-between font-bold text-base pt-2"><span>Total Pedido:</span> <span>{total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></div>
                </div>
                 <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="contract-number-dialog">Número de Contrato</Label>
                    <Input id="contract-number-dialog" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="Nº de Servicio de la OS" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-date-dialog">Fecha de Entrega</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="delivery-date-dialog"
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !deliveryDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deliveryDate ? format(deliveryDate, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={deliveryDate}
                        onSelect={setDeliveryDate}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="delivery-space-dialog">Lugar de Entrega</Label>
                    <Input id="delivery-space-dialog" value={deliverySpace} readOnly placeholder="Espacio definido en la OS" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="delivery-location-dialog">Localización</Label>
                     <div className="flex items-center gap-2">
                        <Select value={deliveryLocation} onValueChange={setDeliveryLocation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una localización..." />
                            </SelectTrigger>
                            <SelectContent>
                                {serviceOrder?.deliveryLocations?.map(loc => (
                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setIsAddingLocation(true)}><FilePlus className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSubmit}>Confirmar y Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
      <AlertDialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Añadir Nueva Localización</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta localización se guardará en la Orden de Servicio para futuros pedidos.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                 <Input 
                    placeholder="Ej. Salón principal, Cocina, Barra..."
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleAddNewLocation}>Añadir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
