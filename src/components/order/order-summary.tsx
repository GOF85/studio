'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingCart, Trash2, Minus, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { format } from "date-fns";
import { es } from 'date-fns/locale';

import type { OrderItem, CateringItem, ServiceOrder } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface OrderSummaryProps {
  items: OrderItem[];
  onUpdateQuantity: (itemCode: string, quantity: number) => void;
  onRemoveItem: (itemCode: string) => void;
  onSubmitOrder: (finalOrder: { items: OrderItem[], days: number, total: number, contractNumber?: string, deliveryDate?: string, deliveryLocation?: string }) => void;
  onClearOrder: () => void;
  isEditing?: boolean;
  serviceOrder: ServiceOrder | null;
}

export function OrderSummary({ items, onUpdateQuantity, onRemoveItem, onSubmitOrder, onClearOrder, isEditing = false, serviceOrder }: OrderSummaryProps) {
  const [rentalDays, setRentalDays] = useState(1);
  const [isReviewOpen, setReviewOpen] = useState(false);
  const [contractNumber, setContractNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (serviceOrder) {
      setContractNumber(serviceOrder.serviceNumber || '');
      setDeliveryLocation(serviceOrder.space || '');
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

  const handleSubmit = () => {
    if (!contractNumber) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, introduce el número de contrato.' });
        return;
    }
    onSubmitOrder({
      items,
      days: rentalDays,
      total,
      contractNumber,
      deliveryDate: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : undefined,
      deliveryLocation,
    });
    setReviewOpen(false);
  };
  
  return (
    <Card className="sticky top-24">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-headline">Tu Pedido</CardTitle>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearOrder} aria-label="Vaciar pedido">
            <Trash2 className="h-4 w-4 mr-1" />
            Vaciar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
            <ShoppingCart className="h-12 w-12 mb-4" />
            <p className="font-medium">Tu cesta está vacía</p>
            <p className="text-sm">Añade artículos desde el catálogo para empezar.</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2">
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.itemCode} className="flex items-center gap-4">
                   <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                    <Image src={item.imageUrl} alt={item.description} fill className="object-cover" data-ai-hint={item.imageHint}/>
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
              ))}
            </ul>
          </div>
        )}
        {items.length > 0 && (
          <>
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
          </>
        )}
      </CardContent>
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
                    <Input id="contract-number-dialog" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="Introduce el nº de contrato" />
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
                    <Label htmlFor="delivery-location-dialog">Lugar de Entrega</Label>
                    <Input id="delivery-location-dialog" value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Introduce el lugar de entrega" />
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
