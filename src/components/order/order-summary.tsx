
'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingCart, Trash2, Minus, Plus, Calendar as CalendarIcon, FilePlus } from 'lucide-react';
import { format } from "date-fns";
import { es } from 'date-fns/locale';

import type { OrderItem, ServiceOrder, PedidoPlantilla } from '@/types';
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
  DialogFooter,
  DialogClose,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Combobox } from '../ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export type ExistingOrderData = {
    days: number;
    contractNumber: string;
    deliveryDate?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
    solicita?: 'Sala' | 'Cocina';
}
interface OrderSummaryProps {
  items: OrderItem[];
  onUpdateQuantity: (itemCode: string, quantity: number) => void;
  onRemoveItem: (itemCode: string) => void;
  onSubmitOrder: (finalOrder: { items: OrderItem[], days: number, total: number, contractNumber: string, deliveryDate?: string, deliverySpace?: string, deliveryLocation?: string, solicita?: 'Sala' | 'Cocina' }) => void;
  onClearOrder: () => void;
  isEditing?: boolean;
  serviceOrder: ServiceOrder | null;
  onAddLocation: (newLocation: string) => void;
  existingOrderData?: ExistingOrderData | null;
  orderType: string | null;
}

function isValidHttpUrl(string: string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

export function OrderSummary({ items, onUpdateQuantity, onRemoveItem, onSubmitOrder, onClearOrder, isEditing = false, serviceOrder, onAddLocation, existingOrderData, orderType }: OrderSummaryProps) {
  const [rentalDays, setRentalDays] = useState(1);
  const [isReviewOpen, setReviewOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [deliverySpace, setDeliverySpace] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [solicita, setSolicita] = useState<'Sala' | 'Cocina' | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const isRental = orderType === 'Alquiler';

  useEffect(() => {
    if (isEditing && existingOrderData) {
        setRentalDays(existingOrderData.days || 1);
        setDeliveryDate(existingOrderData.deliveryDate ? new Date(existingOrderData.deliveryDate) : new Date());
        setDeliverySpace(existingOrderData.deliverySpace || '');
        setDeliveryLocation(existingOrderData.deliveryLocation || '');
        setSolicita(existingOrderData.solicita);
    } else if (serviceOrder) {
      setDeliverySpace(serviceOrder.space || '');
      if (serviceOrder.startDate) {
        setDeliveryDate(new Date(serviceOrder.startDate));
      }
    }
  }, [serviceOrder, isEditing, existingOrderData]);
  
  const locationOptions = useMemo(() => {
    return serviceOrder?.deliveryLocations?.map(loc => ({ label: loc, value: loc })) || [];
  }, [serviceOrder]);


  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  const itemsTotal = subtotal * (isRental ? rentalDays : 1);
  const total = itemsTotal;

  const handleLocationChange = (value: string) => {
    const isNew = !locationOptions.some(opt => opt.value === value);
    if(isNew && value) {
      onAddLocation(value);
    }
    setDeliveryLocation(value);
  }

  const handleSubmit = () => {
    if (!serviceOrder?.serviceNumber) {
        toast({ variant: 'destructive', title: 'Error', description: 'El Nº de Servicio de la OS es obligatorio.' });
        return;
    }
     if (!deliveryDate) {
        toast({ variant: 'destructive', title: 'Error', description: 'La fecha de entrega es obligatoria.' });
        return;
    }
     if (!deliveryLocation) {
        toast({ variant: 'destructive', title: 'Error', description: 'La localización es obligatoria.' });
        return;
    }
    if (!solicita) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar quién solicita el pedido.' });
        return;
    }
    onSubmitOrder({
      items,
      days: isRental ? rentalDays : 1,
      total,
      contractNumber: serviceOrder.serviceNumber,
      deliveryDate: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : undefined,
      deliverySpace,
      deliveryLocation,
      solicita,
    });
    setReviewOpen(false);
  };
  
  return (
    <Card className="sticky top-24 h-[calc(100vh-7rem)] flex flex-col">
      <CardHeader className="flex-grow-0 flex-shrink-0 flex flex-row items-center justify-between p-4">
        <CardTitle className="text-xl font-headline">Tu Pedido</CardTitle>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearOrder} aria-label="Vaciar pedido">
            <Trash2 className="h-4 w-4 mr-1" />
            Vaciar
          </Button>
        )}
      </CardHeader>
      <div className="flex-grow overflow-y-auto">
        <CardContent className="p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 h-full">
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
                      <p className="text-sm text-muted-foreground">
                        {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        {isRental && '/día'}
                        </p>
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
      </div>
      {items.length > 0 && (
          <div className="flex-grow-0 flex-shrink-0 p-6 pt-0">
            <Separator className="my-4" />
            {isRental && (
              <>
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
              </>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} artículos):</span>
                <span>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              {isRental &&
                <div className="flex justify-between">
                  <span>Días de alquiler:</span>
                  <span>x{rentalDays}</span>
                </div>
              }
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total:</span>
                <span>{total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>
          </div>
        )}
      <CardFooter className="flex-grow-0 flex-shrink-0">
        <Dialog open={isReviewOpen} onOpenChange={setReviewOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg" disabled={items.length === 0}>
              {isEditing ? 'Actualizar Pedido' : 'Guardar Pedido'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Actualizar Pedido de Material' : 'Guardar Pedido de Material'}</DialogTitle>
            </DialogHeader>
             <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="delivery-date-dialog" className="font-bold">Fecha de Entrega</Label>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                            onSelect={(date) => { setDeliveryDate(date); setIsCalendarOpen(false); }}
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
                        <Combobox
                          options={locationOptions}
                          value={deliveryLocation}
                          onChange={handleLocationChange}
                          onCreated={onAddLocation}
                          placeholder="Busca o crea una localización..."
                          searchPlaceholder="Buscar localización..."
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Solicita</Label>
                        <Select onValueChange={(value: 'Sala' | 'Cocina') => setSolicita(value)} value={solicita}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Sala">Sala</SelectItem>
                                <SelectItem value="Cocina">Cocina</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="font-semibold">Resumen del Pedido</h4>
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                      <ScrollArea className="h-full">
                        <ul className="space-y-2 p-2">
                            {items.map(item => (
                                <li key={item.itemCode} className="flex justify-between items-center text-sm">
                                    <span>{item.quantity} x {item.description}</span>
                                    <span>{(item.quantity * item.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                </li>
                            ))}
                        </ul>
                      </ScrollArea>
                    </div>
                    <Separator />
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Subtotal:</span> <span>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></div>
                        {isRental && 
                          <div className="flex justify-between"><span>Días de alquiler:</span> <span>x{rentalDays}</span></div>
                        }
                        <div className="flex justify-between font-bold text-base pt-2"><span>Total Pedido:</span> <span>{total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></div>
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
    </Card>
  );
}
