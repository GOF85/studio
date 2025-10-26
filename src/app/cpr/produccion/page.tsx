
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChefHat, Printer, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import type { OrdenFabricacion, Personal, Elaboracion, IngredienteInterno, ArticuloERP, Alergeno } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { TooltipProvider } from '@/components/ui/tooltip';

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' } = {
  'Pendiente': 'secondary',
  'Asignada': 'default',
  'En Proceso': 'outline',
  'Finalizado': 'success',
  'Incidencia': 'destructive',
  'Validado': 'success',
};

type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

function PrintLabelDialog({ of, elaboracion, ingredientes }: { of: OrdenFabricacion; elaboracion: Elaboracion | null; ingredientes: IngredienteConERP[] }) {
    const [expirationDate, setExpirationDate] = useState<Date>(() => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
    });
    const [isOpen, setIsOpen] = useState(false);

    const handlePrint = () => {
        window.print();
        setIsOpen(false);
    };
    
    if (!elaboracion) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><Printer className="mr-2 h-4 w-4" />Imprimir Etiqueta</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                 <TooltipProvider>
                    <DialogHeader>
                        <DialogTitle>Etiqueta para Lote: {of.id}</DialogTitle>
                        <DialogDescription>
                            Selecciona la fecha de caducidad y confirma la impresión.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 py-4">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Label htmlFor="expiration-date">Fecha de Caducidad</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button variant={"outline"} id="expiration-date" className={cn("w-[240px] justify-start text-left font-normal")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(expirationDate, "PPP", { locale: es })}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={expirationDate} onSelect={(date) => date && setExpirationDate(date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div id="printable-label" className="p-4 border rounded-lg w-[11cm] h-[9cm] flex flex-col bg-white text-black font-sans">
                                <div className="text-center border-b pb-2">
                                    <h2 className="text-2xl font-bold">{of.elaboracionNombre}</h2>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span><strong>Lote:</strong> {of.id}</span>
                                    <span><strong>Producción:</strong> {format(new Date(of.fechaFinalizacion || of.fechaCreacion), 'dd/MM/yyyy')}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span><strong>Cant. Producida:</strong> {of.cantidadReal || of.cantidadTotal} {of.unidad}</span>
                                    <span><strong>Caducidad:</strong> {format(expirationDate, 'dd/MM/yyyy')}</span>
                                </div>
                                <div className="flex-grow border-t border-b py-2 my-2 overflow-hidden">
                                    <h3 className="font-bold text-xs">Ingredientes:</h3>
                                    <p className="text-[10px] leading-tight columns-2">
                                        {ingredientes.map(ing => ing.nombreIngrediente).join(', ')}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h3 className="font-bold text-xs">Alérgenos:</h3>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {Array.from(new Set(ingredientes.flatMap(i => [...(i.alergenosPresentes || []), ...(i.alergenosTrazas || [])]))).map(a => (
                                            <AllergenBadge key={a} allergen={a as Alergeno}/>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <style>
                            {`
                            @media print {
                                body * {
                                visibility: hidden;
                                }
                                #printable-label, #printable-label * {
                                visibility: visible;
                                }
                                #printable-label {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 11cm;
                                height: 9cm;
                                margin: 0;
                                padding: 10px;
                                border: none;
                                }
                            }
                            `}
                        </style>
                    </div>
                    <DialogFooter>
                       <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handlePrint}><Printer className="mr-2"/>Imprimir</Button>
                    </DialogFooter>
                 </TooltipProvider>
            </DialogContent>
        </Dialog>
    );
}


export default function ProduccionPage() {
  const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
  const [selectedCocinero, setSelectedCocinero] = useState<string | null>(null);
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [elaboraciones, setElaboraciones] = useState<Map<string, Elaboracion>>(new Map());
  const [ingredientes, setIngredientes] = useState<Map<string, IngredienteConERP>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const allPersonal = (JSON.parse(localStorage.getItem('personal') || '[]') as Personal[]).filter(p => p.departamento === 'CPR');
    setPersonalCPR(allPersonal);
    
    const allOFs = (JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[]);
    setOrdenes(allOFs);

    const allElab = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    setElaboraciones(new Map(allElab.map(e => [e.id, e])));
    
    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
    const combinedIngredientes = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
    setIngredientes(new Map(combinedIngredientes.map(i => [i.id, i])));

    const lastSelected = localStorage.getItem('lastSelectedCocinero');
    if(lastSelected) {
        setSelectedCocinero(lastSelected);
    }
    setIsMounted(true);
  }, []);

  const handleSelectCocinero = (cocinero: string) => {
    setSelectedCocinero(cocinero);
    localStorage.setItem('lastSelectedCocinero', cocinero);
  }

  const filteredOrdenesTareas = useMemo(() => {
    if (!selectedCocinero) return [];
    return ordenes
      .filter(of => of.responsable === selectedCocinero && (of.estado === 'Asignada' || of.estado === 'En Proceso'))
      .sort((a, b) => new Date(a.fechaProduccionPrevista).getTime() - new Date(b.fechaProduccionPrevista).getTime());
  }, [ordenes, selectedCocinero]);
  
  const filteredOrdenesFinalizadas = useMemo(() => {
    return ordenes
      .filter(of => of.estado === 'Finalizado' || of.estado === 'Validado')
      .sort((a, b) => new Date(b.fechaFinalizacion || b.fechaCreacion).getTime() - new Date(a.fechaFinalizacion || a.fechaCreacion).getTime());
  }, [ordenes]);
  
  const getIngredientesForElaboracion = (elaboracionId: string): IngredienteConERP[] => {
    const elab = elaboraciones.get(elaboracionId);
    if (!elab) return [];
    
    return (elab.componentes || [])
      .map(c => c.tipo === 'ingrediente' ? ingredientes.get(c.componenteId) : undefined)
      .filter(Boolean) as IngredienteConERP[];
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Taller de Producción..." />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-4 mb-8">
        <ChefHat className="h-16 w-16 text-primary" />
        <h1 className="text-4xl font-headline font-bold">Taller de Producción</h1>
        <div className="w-full max-w-sm">
            <Select onValueChange={handleSelectCocinero} value={selectedCocinero || ''}>
                <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Selecciona tu nombre para empezar..." />
                </SelectTrigger>
                <SelectContent>
                    {personalCPR.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre} {p.apellidos}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>

      <Tabs defaultValue="tareas">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tareas">Mis Tareas</TabsTrigger>
            <TabsTrigger value="etiquetas">Impresión de Etiquetas</TabsTrigger>
        </TabsList>
        <TabsContent value="tareas" className="mt-4">
             {selectedCocinero && (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Elaboración</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrdenesTareas.length > 0 ? (
                                filteredOrdenesTareas.map(of => (
                                    <TableRow 
                                        key={of.id} 
                                        onClick={() => router.push(`/cpr/produccion/${of.id}`)}
                                        className={cn("cursor-pointer text-base", of.estado === 'En Proceso' && 'bg-blue-100/50 font-bold')}
                                    >
                                        <TableCell className="py-4">{of.elaboracionNombre}</TableCell>
                                        <TableCell className="py-4">{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="py-4">{of.cantidadTotal} {of.unidad}</TableCell>
                                        <TableCell className="py-4"><Badge variant={statusVariant[of.estado]}>{of.estado}</Badge></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center text-lg text-muted-foreground">
                                        No tienes órdenes de fabricación asignadas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </TabsContent>
        <TabsContent value="etiquetas" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Etiquetado de Producción Finalizada</CardTitle>
                    <CardDescription>Selecciona un lote para generar su etiqueta.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lote (OF)</TableHead>
                                <TableHead>Elaboración</TableHead>
                                <TableHead>Fecha Finalización</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrdenesFinalizadas.length > 0 ? (
                                filteredOrdenesFinalizadas.map(of => {
                                   const elab = elaboraciones.get(of.elaboracionId);
                                   const ings = elab ? getIngredientesForElaboracion(elab.id) : [];
                                   return (
                                     <TableRow key={of.id}>
                                        <TableCell><Badge variant="secondary">{of.id}</Badge></TableCell>
                                        <TableCell>{of.elaboracionNombre}</TableCell>
                                        <TableCell>{of.fechaFinalizacion ? format(new Date(of.fechaFinalizacion), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <PrintLabelDialog of={of} elaboracion={elab || null} ingredientes={ings} />
                                        </TableCell>
                                    </TableRow>
                                  )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No hay órdenes de fabricación finalizadas.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
