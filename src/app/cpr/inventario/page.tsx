

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Search, SlidersHorizontal, FileDown, FileUp, PlusCircle, Activity, X, Save, Loader2, Trash2 } from 'lucide-react';
import type { ArticuloERP, StockArticuloUbicacion, Ubicacion, StockLote, CentroProduccion, IncidenciaInventario } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';

type StockConsolidado = {
    articulo: ArticuloERP;
    stockTotal: number;
    valoracion: number;
};

type RecuentoItem = {
    id: string; // articuloErpId
    nombre: string;
    unidad: string;
    stockTeorico: number;
    contado: boolean;
    cantidadReal: number | string;
    discrepancia?: number;
    esNuevo?: boolean;
}

function StockEntryDialog({ onSave, defaultUbicacionId }: { onSave: (data: any) => void; defaultUbicacionId?: string | null }) {
    const [articulos, setArticulos] = useState<ArticuloERP[]>([]);
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [selectedArticuloId, setSelectedArticuloId] = useState<string | null>(null);
    const [selectedUbicacionId, setSelectedUbicacionId] = useState<string | null>(null);
    const [cantidadCompra, setCantidadCompra] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [precio, setPrecio] = useState('');
    const [fechaCaducidad, setFechaCaducidad] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        setArticulos(JSON.parse(localStorage.getItem('articulosERP') || '[]'));
        setUbicaciones(JSON.parse(localStorage.getItem('ubicaciones') || '[]'));
        if (defaultUbicacionId) {
            setSelectedUbicacionId(defaultUbicacionId);
        }
    }, [defaultUbicacionId]);

    const selectedArticulo = useMemo(() => {
        return articulos.find(a => a.idreferenciaerp === selectedArticuloId);
    }, [selectedArticuloId, articulos]);
    
    useEffect(() => {
        if(selectedArticulo) {
            setPrecio(String(selectedArticulo.precioCompra / (selectedArticulo.unidadConversion || 1)));
            
            const cantidadNum = parseFloat(cantidadCompra);
            if (!isNaN(cantidadNum)) {
                setCantidad(String(cantidadNum * (selectedArticulo.unidadConversion || 1)));
            }
        }
    }, [selectedArticulo, cantidadCompra]);

    const handleSave = () => {
        if (!selectedArticulo || !selectedUbicacionId || !cantidad) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes completar todos los campos obligatorios.' });
            return;
        }

        const data = {
            articulo: selectedArticulo,
            ubicacionId: selectedUbicacionId,
            cantidad: parseFloat(cantidad),
            precio: parseFloat(precio),
            fechaCaducidad: fechaCaducidad || undefined,
        };

        onSave(data);
    };
    
    const articuloOptions = useMemo(() => articulos.map(a => ({ label: a.nombreProductoERP, value: a.idreferenciaerp })), [articulos]);
    const ubicacionOptions = useMemo(() => ubicaciones.map(u => ({ label: u.nombre, value: u.id })), [ubicaciones]);

    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>Registrar Entrada de Mercancía</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Producto</Label>
                    <Combobox
                        options={articuloOptions}
                        value={selectedArticuloId || ''}
                        onChange={setSelectedArticuloId}
                        placeholder="Buscar producto ERP..."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Ubicación de Almacenamiento</Label>
                    <Combobox
                        options={ubicacionOptions}
                        value={selectedUbicacionId || ''}
                        onChange={setSelectedUbicacionId}
                        placeholder="Seleccionar ubicación..."
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Cantidad Compra (ej. Cajas)</Label>
                        <Input type="number" value={cantidadCompra} onChange={e => setCantidadCompra(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Cantidad Recibida ({selectedArticulo ? formatUnit(selectedArticulo.unidad) : 'Uds'})</Label>
                        <Input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Precio de Compra / {selectedArticulo ? formatUnit(selectedArticulo.unidad) : 'Ud'}</Label>
                        <Input type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} />
                    </div>
                    {selectedArticulo?.gestionLote && (
                        <div className="space-y-2">
                            <Label>Fecha de Caducidad</Label>
                            <Input type="date" value={fechaCaducidad} onChange={e => setFechaCaducidad(e.target.value)} />
                        </div>
                    )}
                 </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                <Button onClick={handleSave}>Añadir al Stock</Button>
            </DialogFooter>
        </DialogContent>
    )
}

function IncidenciaDialog({ onSave, zonaActual }: { onSave: (data: { descripcion: string; cantidad: string; foto?: string; }) => void; zonaActual: string }) {
    const [descripcion, setDescripcion] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [foto, setFoto] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setFoto(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleSave = () => {
        if (!descripcion || !cantidad) {
            toast({ variant: 'destructive', title: 'Error', description: 'Descripción y cantidad son obligatorios.' });
            return;
        }
        onSave({ descripcion, cantidad, foto: foto || undefined });
        setDescripcion('');
        setCantidad('');
        setFoto(null);
    };

    return (
        <DialogContent>
            <DialogHeader><DialogTitle>Registrar Artículo no Identificado</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <Textarea placeholder="Describe el producto (ej: Caja azul, terrones de azúcar grandes)" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                <Input placeholder="Cantidad contada (ej: 3 cajas)" value={cantidad} onChange={e => setCantidad(e.target.value)} />
                <Input type="file" accept="image/*" onChange={handleFileChange} />
                {foto && <img src={foto} alt="Preview" className="max-h-40 rounded-md object-contain mx-auto" />}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                <Button onClick={handleSave}>Registrar Incidencia</Button>
            </DialogFooter>
        </DialogContent>
    );
}


export default function InventarioPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stock, setStock] = useState<StockConsolidado[]>([]);
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();
    
    const [centros, setCentros] = useState<CentroProduccion[]>([]);
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [allArticulos, setAllArticulos] = useState<ArticuloERP[]>([]);
    const [allStockUbicacion, setAllStockUbicacion] = useState<Record<string, StockArticuloUbicacion>>({});

    const [isRecounting, setIsRecounting] = useState(false);
    const [selectedCentro, setSelectedCentro] = useState<string>('');
    const [selectedUbicacion, setSelectedUbicacion] = useState<string>('');
    const [recuentoItems, setRecuentoItems] = useState<RecuentoItem[]>([]);
    const [isArticuloDialogOpen, setIsArticuloDialogOpen] = useState(false);
    const [isIncidenciaDialogOpen, setIsIncidenciaDialogOpen] = useState(false);
    const [showOnlyDiscrepancies, setShowOnlyDiscrepancies] = useState(false);

    const loadData = useCallback(() => {
        const storedArticulos = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const storedStock = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}') as Record<string, StockArticuloUbicacion>;
        setAllArticulos(storedArticulos);
        setAllStockUbicacion(storedStock);

        const stockMap = new Map<string, number>();
        Object.values(storedStock).forEach(item => {
            const currentStock = stockMap.get(item.articuloErpId) || 0;
            stockMap.set(item.articuloErpId, currentStock + item.stockTeorico);
        });

        const stockConsolidado: StockConsolidado[] = storedArticulos.map(articulo => {
            const stockTotal = stockMap.get(articulo.idreferenciaerp) || 0;
            const valoracion = stockTotal * (articulo.precio || 0);
            return { articulo, stockTotal, valoracion };
        }).filter(item => item.stockTotal > 0.001);

        setStock(stockConsolidado);
        setCentros(JSON.parse(localStorage.getItem('centros') || '[]'));
        setUbicaciones(JSON.parse(localStorage.getItem('ubicaciones') || '[]'));
    }, []);

    useEffect(() => {
        loadData();
        setIsMounted(true);
    }, [loadData]);
    
    useEffect(() => {
        if (!isRecounting || !selectedUbicacion) {
            setRecuentoItems([]);
            return;
        }

        const itemsInLocation = allArticulos.filter(articulo => 
            Object.values(allStockUbicacion).some(stock => 
                stock.articuloErpId === articulo.idreferenciaerp && stock.ubicacionId === selectedUbicacion
            )
        );

        setRecuentoItems(itemsInLocation.map(articulo => {
            const stockInfo = Object.values(allStockUbicacion).find(s => s.articuloErpId === articulo.idreferenciaerp && s.ubicacionId === selectedUbicacion);
            return {
                id: articulo.idreferenciaerp,
                nombre: articulo.nombreProductoERP,
                unidad: articulo.unidad,
                stockTeorico: stockInfo?.stockTeorico || 0,
                cantidadReal: '',
                contado: false,
            };
        }));
    }, [isRecounting, selectedUbicacion, allArticulos, allStockUbicacion]);

    const filteredStock = useMemo(() => {
        return stock.filter(item => 
            item.articulo.nombreProductoERP.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.articulo.tipo || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [stock, searchTerm]);
    
    const totalValoracion = useMemo(() => {
        return filteredStock.reduce((sum, item) => sum + item.valoracion, 0);
    }, [filteredStock]);
    
    const handleSaveStockEntry = (data: { articulo: ArticuloERP; ubicacionId: string; cantidad: number; precio: number; fechaCaducidad?: string }) => {
        const allStock = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}') as Record<string, StockArticuloUbicacion>;
        const stockKey = `${data.articulo.idreferenciaerp}_${data.ubicacionId}`;

        if (!allStock[stockKey]) {
            allStock[stockKey] = {
                id: stockKey, articuloErpId: data.articulo.idreferenciaerp, ubicacionId: data.ubicacionId,
                stockTeorico: 0, lotes: []
            };
        }

        allStock[stockKey].stockTeorico += data.cantidad;
        
        if (data.articulo.gestionLote && data.fechaCaducidad) {
            allStock[stockKey].lotes.push({
                id: `lote-${Date.now()}`, cantidad: data.cantidad, fechaEntrada: new Date().toISOString(),
                fechaCaducidad: data.fechaCaducidad, precioCompraUnitario: data.precio,
            });
        }

        localStorage.setItem('stockArticuloUbicacion', JSON.stringify(allStock));
        toast({ title: 'Entrada registrada', description: `${data.cantidad} ${formatUnit(data.articulo.unidad)} de ${data.articulo.nombreProductoERP} añadido al stock.` });
        loadData();
    };

    const handleSaveIncidencia = ({ descripcion, cantidad, foto }: { descripcion: string; cantidad: string; foto?: string; }) => {
        if (!impersonatedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se puede registrar sin un usuario.' });
            return;
        }

        const allIncidencias = JSON.parse(localStorage.getItem('incidenciasInventario') || '[]') as IncidenciaInventario[];
        const newIncidencia: IncidenciaInventario = {
            id: Date.now().toString(), fecha: new Date().toISOString(), zona: selectedUbicacion, responsable: impersonatedUser.nombre,
            descripcionLibre: descripcion, cantidadContada: cantidad, fotoUrl: foto, estado: 'PENDIENTE_IDENTIFICACION'
        };
        allIncidencias.push(newIncidencia);
        localStorage.setItem('incidenciasInventario', JSON.stringify(allIncidencias));
        toast({ title: 'Incidencia Registrada', description: 'El supervisor revisará el artículo no identificado.' });
        setIsIncidenciaDialogOpen(false);
    };
    
     const handleUpdateRecuento = (itemId: string, cantidad: string) => {
        setRecuentoItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const qtyReal = parseFloat(cantidad);
                const discrepancia = !isNaN(qtyReal) ? qtyReal - item.stockTeorico : undefined;
                return { ...item, cantidadReal: cantidad, contado: true, discrepancia };
            }
            return item;
        }));
    };

    const handleFinalizeRecuento = () => {
        if (!selectedUbicacion) return;

        const allStock = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}') as Record<string, StockArticuloUbicacion>;
        
        recuentoItems.forEach(item => {
            if (item.contado && typeof item.cantidadReal === 'string') {
                const stockKey = `${item.id}_${selectedUbicacion}`;
                const cantidadRealNum = parseFloat(item.cantidadReal);
                
                if (!isNaN(cantidadRealNum)) {
                     if (allStock[stockKey]) {
                        allStock[stockKey].stockTeorico = cantidadRealNum;
                    } else if (item.esNuevo) {
                        allStock[stockKey] = {
                            id: stockKey,
                            articuloErpId: item.id,
                            ubicacionId: selectedUbicacion,
                            stockTeorico: cantidadRealNum,
                            lotes: []
                        };
                    }
                }
            }
        });

        localStorage.setItem('stockArticuloUbicacion', JSON.stringify(allStock));
        toast({ title: "Recuento Finalizado", description: "El stock teórico ha sido ajustado según el conteo."});
        setIsRecounting(false);
        setSelectedCentro('');
        setSelectedUbicacion('');
        loadData();
    };

    const filteredRecuentoItems = useMemo(() => {
        if (!showOnlyDiscrepancies) return recuentoItems;
        return recuentoItems.filter(item => item.contado && item.discrepancia !== 0);
    }, [recuentoItems, showOnlyDiscrepancies]);
    
    const handleAddNewItemToRecuento = (data: { articulo: ArticuloERP; ubicacionId: string; cantidad: number; }) => {
        setRecuentoItems(prev => [
            ...prev,
            {
                id: data.articulo.idreferenciaerp,
                nombre: data.articulo.nombreProductoERP,
                unidad: data.articulo.unidad,
                stockTeorico: 0,
                cantidadReal: data.cantidad,
                contado: true,
                esNuevo: true,
                discrepancia: data.cantidad,
            }
        ]);
        setIsArticuloDialogOpen(false);
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Inventario de Materia Prima..." />;
    }

    return (
        <div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Archive />
                        Inventario de Materia Prima (CPR)
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Consulta el stock teórico, realiza recuentos físicos y gestiona el inventario.
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline"><PlusCircle className="mr-2"/>Entrada Compra</Button>
                        </DialogTrigger>
                        <StockEntryDialog onSave={handleSaveStockEntry} />
                    </Dialog>
                    <Button onClick={() => setIsRecounting(true)}><SlidersHorizontal className="mr-2"/>Iniciar Recuento</Button>
                </div>
            </div>

            {!isRecounting ? (
                 <Card>
                    <CardHeader>
                        <CardTitle>Stock Teórico Consolidado</CardTitle>
                        <div className="flex justify-between items-center">
                            <Input 
                                placeholder="Buscar producto o categoría..." className="max-w-sm"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <div className="text-right">
                                <div className="text-sm font-semibold text-muted-foreground">Valoración Total del Stock</div>
                                <div className="text-2xl font-bold text-primary">{formatCurrency(totalValoracion)}</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                            <Table><TableHeader className="sticky top-0 bg-secondary">
                                <TableRow><TableHead>Producto</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Stock Teórico</TableHead><TableHead className="text-right">Valoración</TableHead><TableHead className="text-right">Stock Mínimo</TableHead></TableRow>
                            </TableHeader><TableBody>
                                {filteredStock.map(item => {
                                    const porDebajoMinimo = item.stockTotal < (item.articulo.stockMinimo || 0);
                                    return (
                                    <TableRow key={item.articulo.idreferenciaerp} className={porDebajoMinimo ? 'bg-amber-100/50' : ''}>
                                        <TableCell className="font-semibold">{item.articulo.nombreProductoERP}</TableCell>
                                        <TableCell><Badge variant="outline">{item.articulo.tipo}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stockTotal, 2)} {formatUnit(item.articulo.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.valoracion)}</TableCell>
                                        <TableCell className="text-right font-mono">{item.articulo.stockMinimo ? `${formatNumber(item.articulo.stockMinimo, 2)} ${formatUnit(item.articulo.unidad)}` : '-'}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody></Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Modo Recuento de Inventario</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => setIsRecounting(false)}>Cancelar</Button>
                                <Button onClick={handleFinalizeRecuento} disabled={!recuentoItems.every(i => i.contado)}>Finalizar y Guardar Recuento</Button>
                            </div>
                        </div>
                        <div className="flex items-end gap-4 pt-4">
                            <Select value={selectedCentro} onValueChange={setSelectedCentro}>
                                <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar Centro..." /></SelectTrigger>
                                <SelectContent>{centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={selectedUbicacion} onValueChange={setSelectedUbicacion} disabled={!selectedCentro}>
                                <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar Ubicación..." /></SelectTrigger>
                                <SelectContent>{ubicaciones.filter(u => u.centroId === selectedCentro).map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <Dialog open={isArticuloDialogOpen} onOpenChange={setIsArticuloDialogOpen}>
                                <DialogTrigger asChild><Button variant="outline" size="sm" disabled={!selectedUbicacion}><PlusCircle className="mr-2"/>Añadir Artículo no Listado</Button></DialogTrigger>
                                <StockEntryDialog onSave={handleAddNewItemToRecuento} defaultUbicacionId={selectedUbicacion} />
                            </Dialog>
                             <Dialog open={isIncidenciaDialogOpen} onOpenChange={setIsIncidenciaDialogOpen}>
                                <DialogTrigger asChild><Button variant="outline" size="sm" disabled={!selectedUbicacion}>❓ Registrar Artículo no Identificado</Button></DialogTrigger>
                                <IncidenciaDialog onSave={handleSaveIncidencia} zonaActual={selectedUbicacion} />
                            </Dialog>
                             <div className="flex items-center space-x-2 ml-auto">
                                <Checkbox id="show-discrepancies" checked={showOnlyDiscrepancies} onCheckedChange={c => setShowOnlyDiscrepancies(Boolean(c))} />
                                <Label htmlFor="show-discrepancies">Mostrar solo discrepancias</Label>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/3">Artículo</TableHead>
                                    <TableHead className="w-24 text-right">Stock Teórico</TableHead>
                                    <TableHead className="w-48 text-right">Cantidad Real</TableHead>
                                    <TableHead className="w-32 text-right">Discrepancia</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecuentoItems.map(item => (
                                    <TableRow key={item.id} className={item.contado ? 'bg-green-50/50' : ''}>
                                        <TableCell className="font-semibold">{item.nombre}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stockTeorico, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                value={item.cantidadReal}
                                                onChange={(e) => handleUpdateRecuento(item.id, e.target.value)}
                                                className="text-right font-bold h-9"
                                            />
                                        </TableCell>
                                        <TableCell className={cn("text-right font-bold", item.discrepancia && item.discrepancia !== 0 && "text-destructive")}>
                                            {item.discrepancia ? `${formatNumber(item.discrepancia, 2)} ${formatUnit(item.unidad)}` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

```
- src/components/layout/os-layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft, Building, FileText, Star, Menu, ClipboardList, Calendar, LayoutDashboard, Phone, ChevronRight, FilePenLine } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';


type NavLink = {
    path: string;
    title: string;
    icon: LucideIcon;
    moduleName?: Parameters<typeof ObjectiveDisplay>[0]['moduleName'];
}

const navLinks: NavLink[] = [
    { path: 'info', title: 'Información OS', icon: FileText },
    { path: 'comercial', title: 'Comercial', icon: Briefcase },
    { path: 'gastronomia', title: 'Gastronomía', icon: Utensils, moduleName: 'gastronomia' },
    { path: 'bodega', title: 'Bodega', icon: Wine, moduleName: 'bodega' },
    { path: 'hielo', title: 'Hielo', icon: Snowflake, moduleName: 'hielo' },
    { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf, moduleName: 'consumibles' },
    { path: 'almacen', title: 'Almacén', icon: Warehouse, moduleName: 'almacen' },
    { path: 'alquiler', title: 'Alquiler', icon: Archive, moduleName: 'alquiler' },
    { path: 'decoracion', title: 'Decoración', icon: Flower2, moduleName: 'decoracion' },
    { path: 'atipicos', title: 'Atípicos', icon: FilePlus, moduleName: 'atipicos' },
    { path: 'personal-mice', title: 'Personal MICE', icon: Users, moduleName: 'personalMice' },
    { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus, moduleName: 'personalExterno' },
    { path: 'transporte', title: 'Transporte', icon: Truck, moduleName: 'transporte' },
    { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck, moduleName: 'costePruebaMenu' },
    { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro },
];

const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function OsHeaderContent({ osId }: { osId: string }) {
    const pathname = usePathname();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [updateKey, setUpdateKey] = useState(Date.now());

    useEffect(() => {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        const handleStorageChange = () => {
            setUpdateKey(Date.now());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [osId, updateKey]);
    
    const {currentModule, isSubPage} = useMemo(() => {
        const pathSegments = pathname.split('/').filter(Boolean); // e.g., ['os', '123', 'gastronomia', '456']
        const osIndex = pathSegments.indexOf('os');
        const moduleSegment = pathSegments[osIndex + 2];
        const subPageSegment = pathSegments[osIndex + 3];

        const module = navLinks.find(link => link.path === moduleSegment);
        
        if (module) {
            return { currentModule: module, isSubPage: !!subPageSegment };
        }

        if (moduleSegment === 'info' || !moduleSegment) {
            return { currentModule: { title: 'Información OS', icon: FileText, path: 'info'}, isSubPage: false};
        }

        return { currentModule: { title: 'Panel de Control', icon: LayoutDashboard, path: '' }, isSubPage: false };
    }, [pathname]);

    if (!serviceOrder) {
        return (
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-32" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Skeleton className="h-6 w-36" />
                </div>
                 <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md h-9">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
             </div>
        );
    }
    
    const durationDays = serviceOrder.startDate && serviceOrder.endDate ? differenceInDays(new Date(serviceOrder.endDate), new Date(serviceOrder.startDate)) + 1 : 0;
    
    const responsables = [
        {label: 'Comercial', name: serviceOrder.comercial},
        {label: 'Metre', name: serviceOrder.respMetre},
        {label: 'PM', name: serviceOrder.respProjectManager},
        {label: 'Pase', name: serviceOrder.respPase},
    ].filter(r => r.name);

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Link href={`/os/${osId}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <ClipboardList className="h-5 w-5"/>
                        <span>{serviceOrder.serviceNumber}</span>
                    </Link>
                    {currentModule && (
                        <>
                         <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                         <Link href={`/os/${osId}/${currentModule.path}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <currentModule.icon className="h-5 w-5"/>
                            <span>{currentModule.title}</span>
                         </Link>
                        </>
                    )}
                    {isSubPage && (
                         <>
                             <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                             <span className="flex items-center gap-2 font-bold text-primary">
                                 <FilePenLine className="h-5 w-5"/>
                                 <span>Edición</span>
                             </span>
                         </>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {(currentModule?.moduleName) && <ObjectiveDisplay osId={osId} moduleName={currentModule.moduleName} updateKey={updateKey} />}
                  {serviceOrder.isVip && <Badge variant="default" className="bg-amber-400 text-black hover:bg-amber-500"><Star className="h-4 w-4 mr-1"/> VIP</Badge>}
                </div>
              </div>
               <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md">
                    <div className="flex items-center gap-3">
                       {responsables.map(resp => (
                           <Tooltip key={resp.label}>
                                <TooltipTrigger className="flex items-center gap-2 cursor-default">
                                    <span className="font-semibold">{resp.label}:</span>
                                    <Avatar className="h-6 w-6 text-xs">
                                        <AvatarFallback>{getInitials(resp.name || '')}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{resp.name}</p>
                                </TooltipContent>
                            </Tooltip>
                       ))}
                    </div>
                    <div className="flex items-center gap-4">
                        {serviceOrder.startDate && serviceOrder.endDate && (
                            <div className="flex items-center gap-2 font-semibold">
                                <Calendar className="h-4 w-4"/>
                                <span>{format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')} - {format(new Date(serviceOrder.endDate), 'dd/MM/yyyy')}</span>
                                {durationDays > 0 && <Badge variant="outline">{durationDays} día{durationDays > 1 && 's'}</Badge>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const osId = params.id as string;
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const dashboardHref = `/os/${osId}`;

    return (
        <div className="container mx-auto">
            <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm py-2 border-b">
                <div className="flex items-center gap-4">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline">
                                <Menu className="h-5 w-5 mr-2" />
                                Módulos
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[250px] sm:w-[280px] p-0">
                            <SheetHeader className="p-4 border-b">
                                <SheetTitle>Módulos de la OS</SheetTitle>
                            </SheetHeader>
                            <ScrollArea className="h-full p-4">
                                <nav className="grid items-start gap-1 pb-4">
                                    <Link href={dashboardHref} onClick={() => setIsSheetOpen(false)}>
                                        <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === `/os/${osId}` ? "bg-accent" : "transparent")}>
                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                            <span>Panel de Control</span>
                                        </span>
                                    </Link>
                                    {navLinks.map((item, index) => {
                                        const href = `/os/${osId}/${item.path}`;
                                        return (
                                            <Link key={index} href={href} onClick={() => setIsSheetOpen(false)}>
                                                <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname.startsWith(href) ? "bg-accent" : "transparent")}>
                                                    <item.icon className="mr-2 h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </nav>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    <div className="flex-grow">
                        <OsHeaderContent osId={osId} />
                    </div>
                </div>
            </div>
            <main className="py-8">
                {children}
            </main>
        </div>
    );
}

```
- src/lib/fonts.ts:
```ts

import { Open_Sans, Roboto, Roboto_Mono } from 'next/font/google';

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-body',
});

export const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-code',
})

```
```

