

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, Search, SlidersHorizontal, FileDown, FileUp, PlusCircle, Activity, X, Save, Loader2, Trash2 } from 'lucide-react';
import type { ArticuloERP, StockArticuloUbicacion, Ubicacion, StockLote, CentroProduccion, IncidenciaInventario, Proveedor } from '@/types';
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

type StockUbicacionDetalle = {
    articulo: ArticuloERP;
    ubicacionId: string;
    ubicacionNombre: string;
    stock: number;
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
            setPrecio(String((selectedArticulo.precioCompra || 0) / (selectedArticulo.unidadConversion || 1)));
            
            const cantidadNum = parseFloat(cantidadCompra.replace(',', '.'));
            if (!isNaN(cantidadNum)) {
                setCantidad(String(cantidadNum * (selectedArticulo.unidadConversion || 1)));
            }
        } else {
             setPrecio('');
             setCantidad('');
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
    
    const articuloOptions = useMemo(() => articulos.map(a => ({ label: a.nombreProductoERP, value: a.idreferenciaerp! })), [articulos]);
    const ubicacionOptions = useMemo(() => ubicaciones.map(u => ({ label: u.nombre, value: u.id })), [ubicaciones]);

    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>Registrar Entrada de Mercancía</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
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
                        <Label>Cantidad a Añadir ({selectedArticulo ? formatUnit(selectedArticulo.unidad) : 'Uds'})</Label>
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

function InventarioPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [stock, setStock] = useState<StockUbicacionDetalle[]>([]);
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
    const [updateTrigger, setUpdateTrigger] = useState(0);

    const loadData = useCallback(() => {
        const storedArticulos = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const storedStock = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}') as Record<string, StockArticuloUbicacion>;
        const storedUbicaciones = JSON.parse(localStorage.getItem('ubicaciones') || '[]') as Ubicacion[];
        
        setAllArticulos(storedArticulos);
        setAllStockUbicacion(storedStock);
        setUbicaciones(storedUbicaciones);

        const stockDetallado: StockUbicacionDetalle[] = [];
        const ubicacionesMap = new Map(storedUbicaciones.map(u => [u.id, u.nombre]));
        const articulosMap = new Map(storedArticulos.map(a => [a.idreferenciaerp, a]));

        Object.values(storedStock).forEach(item => {
            const articulo = articulosMap.get(item.articuloErpId);
            if (articulo) {
                stockDetallado.push({
                    articulo,
                    ubicacionId: item.ubicacionId,
                    ubicacionNombre: ubicacionesMap.get(item.ubicacionId) || 'Desconocida',
                    stock: item.stockTeorico,
                    valoracion: item.stockTeorico * (articulo.precio || 0)
                });
            }
        });

        setStock(stockDetallado);
        setCentros(JSON.parse(localStorage.getItem('centros') || '[]'));
    }, []);

    useEffect(() => {
        loadData();
        setIsMounted(true);
    }, [loadData, updateTrigger]);
    
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
        return stock.filter(item => {
            const matchesSearch =
                item.articulo.nombreProductoERP.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.articulo.tipo || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || (item.articulo.categoriaMice === categoryFilter || item.articulo.tipo === categoryFilter);
            const matchesLocation = locationFilter === 'all' || item.ubicacionId === locationFilter;
            return matchesSearch && matchesCategory && matchesLocation;
        });
    }, [stock, searchTerm, categoryFilter, locationFilter]);

    const categories = useMemo(() => {
        const cats = new Set(allArticulos.map(item => item.categoriaMice || item.tipo).filter(Boolean) as string[]);
        return ['all', ...Array.from(cats).sort()];
    }, [allArticulos]);
    
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
        setUpdateTrigger(Date.now());
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
                const qtyReal = parseFloat(cantidad.replace(',', '.'));
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
            if (item.contado && item.cantidadReal !== '') {
                const stockKey = `${item.id}_${selectedUbicacion}`;
                const cantidadRealNum = parseFloat(String(item.cantidadReal).replace(',', '.'));
                
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
        setUpdateTrigger(Date.now());
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
            <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-semibold tracking-tight">Stock Teórico por Ubicación</h2>
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
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="Buscar producto o categoría..." className="max-w-sm"
                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'Todas las Categorías' : c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={locationFilter} onValueChange={setLocationFilter}>
                                    <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las Ubicaciones</SelectItem>
                                        {ubicaciones.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-semibold text-muted-foreground">Valoración Total del Stock</div>
                                <div className="text-2xl font-bold text-primary">{formatCurrency(totalValoracion)}</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                            <Table><TableHeader className="sticky top-0 bg-secondary">
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead className="text-right">Stock Teórico</TableHead>
                                    <TableHead className="text-right">Valoración</TableHead>
                                </TableRow>
                            </TableHeader><TableBody>
                                {filteredStock.map(item => {
                                    return (
                                    <TableRow key={`${item.articulo.idreferenciaerp}-${item.ubicacionId}`}>
                                        <TableCell className="font-semibold">{item.articulo.nombreProductoERP}</TableCell>
                                        <TableCell><Badge variant="outline">{item.articulo.categoriaMice || item.articulo.tipo}</Badge></TableCell>
                                        <TableCell><Badge variant="secondary">{item.ubicacionNombre}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stock, 2)} {formatUnit(item.articulo.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.valoracion)}</TableCell>
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
                                                type="text" 
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

export default function InventarioPageWrapper() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Inventario..." />}>
            <InventarioPage />
        </Suspense>
    )
}

```
- src/app/os/alquiler/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AlquilerIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/alquiler`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/alquiler/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, Eye, ChevronDown, Save, Loader2, Trash2, FileText } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet, ComercialBriefing, ComercialBriefingItem, ReturnSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type BlockedOrderInfo = {
    sheetId: string;
    status: PickingSheet['status'];
    items: OrderItem[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
}

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);

    useEffect(() => {
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        if (currentBriefing) {
            const sortedItems = [...currentBriefing.items].sort((a, b) => {
                const dateComparison = a.fecha.localeCompare(b.fecha);
                if (dateComparison !== 0) return dateComparison;
                return a.horaInicio.localeCompare(b.horaInicio);
            });
            setBriefingItems(sortedItems);
        }
    }, [osId]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {briefingItems.length > 0 ? briefingItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function AlquilerPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;

 const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(() => {
    if (typeof window === 'undefined') {
        return { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] }, totalValoracionPendiente: 0 };
    }
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Alquiler');

    const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
    const relatedPickingSheets = allPickingSheets.filter(sheet => sheet.osId === osId);

    const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>).filter(s => s.osId === osId);
    
    const mermas: Record<string, number> = {};
    allReturnSheets.forEach(sheet => {
      Object.entries(sheet.itemStates).forEach(([key, state]) => {
        const itemInfo = sheet.items.find(i => `${i.orderId}_${i.itemCode}` === key);
        if (itemInfo && itemInfo.type === 'Alquiler' && itemInfo.sentQuantity > state.returnedQuantity) {
            const perdida = itemInfo.sentQuantity - state.returnedQuantity;
            mermas[itemInfo.itemCode] = (mermas[itemInfo.itemCode] || 0) + perdida;
        }
      });
    });
    
    const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
    const processedItemKeys = new Set<string>();
    const blocked: BlockedOrderInfo[] = [];

    relatedPickingSheets.forEach(sheet => {
        const targetStatus = statusMap[sheet.status];
        const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] };

        sheet.items.forEach(itemInSheet => {
            if (itemInSheet.type !== 'Alquiler') return;
            
            const uniqueKey = `${itemInSheet.orderId}-${itemInSheet.itemCode}`;
            const orderRef = relatedOrders.find(o => o.id === itemInSheet.orderId);
            
            // CRITICAL FIX: Always get the quantity from the source of truth (materialOrders)
            const originalItem = orderRef?.items.find(i => i.itemCode === itemInSheet.itemCode);
            if (!originalItem) return;
            
            const itemWithInfo: ItemWithOrderInfo = {
                ...originalItem, 
                orderId: sheet.id, 
                orderContract: orderRef?.contractNumber || 'N/A', 
                orderStatus: sheet.status, 
                solicita: orderRef?.solicita,
            };

            statusItems[targetStatus].push(itemWithInfo);
            sheetInfo.items.push(itemWithInfo);
            processedItemKeys.add(uniqueKey);
        });

        if (sheetInfo.items.length > 0) {
            blocked.push(sheetInfo);
        }
    });

    const all = relatedOrders.flatMap(order => 
        order.items.map(item => {
            return {
                ...item, 
                orderId: order.id, 
                contractNumber: order.contractNumber, 
                solicita: order.solicita, 
                tipo: item.tipo, 
                deliveryDate: order.deliveryDate,
                ajustes: item.ajustes
            } as ItemWithOrderInfo
        })
    );
    
    const pending = all.filter(item => {
      const uniqueKey = `${item.orderId}-${item.itemCode}`;
      let cantidadAjustada = item.quantity;
      if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
          cantidadAjustada = Math.max(0, cantidadAjustada - mermas[item.itemCode]);
          mermas[item.itemCode] = 0;
      }
      return !processedItemKeys.has(uniqueKey) && cantidadAjustada > 0;
    }).map(item => {
        let cantidadAjustada = item.quantity;
        if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            cantidadAjustada = Math.max(0, cantidadAjustada - mermas[item.itemCode]);
        }
        return {...item, quantity: cantidadAjustada};
    });
    
    statusItems['Asignado'] = pending;

    const totalValoracionPendiente = pending.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return { 
        allItems: all, 
        blockedOrders: blocked,
        pendingItems: pending,
        itemsByStatus: statusItems,
        totalValoracionPendiente
    };
  }, [osId, updateTrigger]);
  
    useEffect(() => {
        setIsMounted(true);
        const forceUpdate = () => setUpdateTrigger(prev => prev + 1);
        window.addEventListener('storage', forceUpdate);
        return () => window.removeEventListener('storage', forceUpdate);
    }, []);
  
  const renderStatusModal = (status: StatusColumn) => {
    const items = itemsByStatus[status];
    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map((item, index) => (
                            <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    )
  }
  
    const renderSummaryModal = () => {
    const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
     const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return (
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Resumen de Artículos de Alquiler</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Cant. Cajas</TableHead>
                <TableHead>Valoración</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((item, index) => {
                const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                return (
                  <TableRow key={`${item.itemCode}-${index}`}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{cajas}</TableCell>
                    <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                    <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
         <div className="flex justify-end font-bold text-lg p-4">
            Valoración Total: {formatCurrency(totalValue)}
        </div>
      </DialogContent>
    )
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Alquiler..." />;
  }

  return (
    <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                </DialogTrigger>
                {renderSummaryModal()}
            </Dialog>
            <BriefingSummaryDialog osId={osId} />
        </div>
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Alquiler`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Alquiler
          </Link>
        </Button>
      </div>
      
       <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                const items = itemsByStatus[status];
                const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return (
                <StatusCard 
                    key={status}
                    title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                    items={items.length}
                    totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                    totalValue={totalValue}
                    onClick={() => setActiveModal(status)}
                />
            )})}
        </div>
      
        <Card className="mb-6">
            <div className="flex items-center justify-between p-4">
                <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
            </div>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Artículo</TableHead>
                                <TableHead>Solicita</TableHead>
                                <TableHead>Fecha Entrega</TableHead>
                                <TableHead className="w-32">Cantidad</TableHead>
                                <TableHead>Valoración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                <TableRow key={item.itemCode + item.orderId}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.solicita}</TableCell>
                                    <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
            </CardHeader>
             <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Hoja Picking</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Contenido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                <TableRow key={order.sheetId}>
                                    <TableCell>
                                        <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                            <Badge variant="secondary">{order.sheetId}</Badge>
                                        </Link>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                    <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

       {activeModal && renderStatusModal(activeModal)}
    </Dialog>
  );
}

```
- src/app/os/bio/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BioIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bio`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bio/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, Eye, ChevronDown, Save, Loader2, Trash2, FileText } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet, ComercialBriefing, ComercialBriefingItem, ReturnSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type BlockedOrderInfo = {
    sheetId: string;
    status: PickingSheet['status'];
    items: OrderItem[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
}

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);

    useEffect(() => {
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        if (currentBriefing) {
            const sortedItems = [...currentBriefing.items].sort((a, b) => {
                const dateComparison = a.fecha.localeCompare(b.fecha);
                if (dateComparison !== 0) return dateComparison;
                return a.horaInicio.localeCompare(b.horaInicio);
            });
            setBriefingItems(sortedItems);
        }
    }, [osId]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {briefingItems.length > 0 ? briefingItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function BioPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(() => {
    if (!isMounted) {
        return { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] }, totalValoracionPendiente: 0 };
    }
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Bio');

    const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
    const relatedPickingSheets = allPickingSheets.filter(sheet => sheet.osId === osId);

    const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>).filter(s => s.osId === osId);
    
    const mermas: Record<string, number> = {};
    allReturnSheets.forEach(sheet => {
      Object.entries(sheet.itemStates).forEach(([key, state]) => {
        const itemInfo = sheet.items.find(i => `${i.orderId}_${i.itemCode}` === key);
        if (itemInfo && itemInfo.type === 'Bio' && itemInfo.sentQuantity > state.returnedQuantity) {
            const perdida = itemInfo.sentQuantity - state.returnedQuantity;
            mermas[itemInfo.itemCode] = (mermas[itemInfo.itemCode] || 0) + perdida;
        }
      });
    });
    
    const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
    const processedItemKeys = new Set<string>();
    const blocked: BlockedOrderInfo[] = [];

    relatedPickingSheets.forEach(sheet => {
        const targetStatus = statusMap[sheet.status];
        const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] };

        sheet.items.forEach(item => {
            if (item.type !== 'Bio') return;
            
            const uniqueKey = `${item.orderId}-${item.itemCode}`;
            const orderRef = relatedOrders.find(o => o.id === item.orderId);
            
            let cantidadReal = item.quantity;
            if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
                const mermaAplicable = Math.min(cantidadReal, mermas[item.itemCode]);
                cantidadReal -= mermaAplicable;
                mermas[item.itemCode] -= mermaAplicable;
            }

            if(cantidadReal > 0) {
              const itemWithInfo: ItemWithOrderInfo = {
                  ...item, 
                  quantity: cantidadReal,
                  orderId: sheet.id, 
                  orderContract: orderRef?.contractNumber || 'N/A', 
                  orderStatus: sheet.status, 
                  solicita: orderRef?.solicita,
              };
              statusItems[targetStatus].push(itemWithInfo);
              sheetInfo.items.push(itemWithInfo);
            }
            processedItemKeys.add(uniqueKey);
        });

        if (sheetInfo.items.length > 0) {
            blocked.push(sheetInfo);
        }
    });

    const all = relatedOrders.flatMap(order => 
        order.items.map(item => {
             let cantidadAjustada = item.quantity;
            (item.ajustes || []).forEach(ajuste => {
              cantidadAjustada += ajuste.cantidad;
            });
            return {
                ...item, 
                quantity: cantidadAjustada,
                orderId: order.id, 
                contractNumber: order.contractNumber, 
                solicita: order.solicita, 
                tipo: item.tipo, 
                deliveryDate: order.deliveryDate,
                ajustes: item.ajustes
            } as ItemWithOrderInfo
        })
    );
    
    const pending = all.filter(item => {
      const uniqueKey = `${item.orderId}-${item.itemCode}`;
      let cantidadAjustada = item.quantity;
      if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
          const mermaAplicable = Math.min(cantidadAjustada, mermas[item.itemCode]);
          cantidadAjustada -= mermaAplicable;
          mermas[item.itemCode] -= mermaAplicable;
      }
      return !processedItemKeys.has(uniqueKey) && cantidadAjustada > 0;
    }).map(item => {
        let cantidadAjustada = item.quantity;
        if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            cantidadAjustada -= mermas[item.itemCode];
        }
        return {...item, quantity: cantidadAjustada};
    });
    
    statusItems['Asignado'] = pending;

    const totalValoracionPendiente = pending.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return { 
        allItems: all, 
        blockedOrders: blocked,
        pendingItems: pending,
        itemsByStatus: statusItems,
        totalValoracionPendiente
    };
  }, [osId, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Bio');
    setMaterialOrders(relatedOrders);
  }, [osId]);

  const handleSaveAll = () => {
    setIsLoading(true);
    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    
    materialOrders.forEach(localOrder => {
      const index = allMaterialOrders.findIndex(o => o.id === localOrder.id);
      if (index !== -1) {
        allMaterialOrders[index] = localOrder;
      }
    });

    localStorage.setItem('materialOrders', JSON.stringify(allMaterialOrders));
    window.dispatchEvent(new Event('storage'));
    toast({ title: 'Guardado', description: 'Todos los cambios en los pedidos han sido guardados.' });
    setIsLoading(false);
  }

  const handleItemChange = (orderId: string, itemCode: string, field: 'quantity' | 'solicita' | 'deliveryDate', value: any) => {
    setMaterialOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id === orderId) {
            if (field === 'solicita' || field === 'deliveryDate') {
                 return { ...order, [field]: value };
            }
          const updatedItems = order.items
            .map(item => item.itemCode === itemCode ? { ...item, [field]: value } : item)
            .filter(item => item.quantity > 0);
          const updatedTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          return { ...order, items: updatedItems, total: updatedTotal };
        }
        return order;
      });
    });
  };

  const handleDeleteItem = (orderId: string, itemCode: string) => {
    handleItemChange(orderId, itemCode, 'quantity', 0);
  }

  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const updatedOrders = allMaterialOrders.filter((o: MaterialOrder) => o.id !== orderToDelete);
    localStorage.setItem('materialOrders', JSON.stringify(updatedOrders));
    setMaterialOrders(updatedOrders.filter((o: MaterialOrder) => o.osId === osId && o.type === 'Bio'));
    window.dispatchEvent(new Event('storage'));
    toast({ title: 'Pedido de material eliminado' });
    setOrderToDelete(null);
  };
  
  const renderStatusModal = (status: StatusColumn) => {
    const items = itemsByStatus[status];
    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map((item, index) => (
                            <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    )
  }
  
  const renderSummaryModal = () => {
    const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
    const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return (
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Resumen de Artículos de Bio</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Cant. Cajas</TableHead>
                <TableHead>Valoración</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((item, index) => {
                const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                return (
                  <TableRow key={`${item.itemCode}-${index}`}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{cajas}</TableCell>
                    <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                    <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
         <div className="flex justify-end font-bold text-lg p-4">
            Valoración Total: {formatCurrency(totalValue)}
        </div>
      </DialogContent>
    )
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Bio..." />;
  }

  return (
    <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                </DialogTrigger>
                {renderSummaryModal()}
            </Dialog>
            <BriefingSummaryDialog osId={osId} />
        </div>
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Bio`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Bio
          </Link>
        </Button>
      </div>
      
       <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                const items = itemsByStatus[status];
                const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return (
                <StatusCard 
                    key={status}
                    title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                    items={items.length}
                    totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                    totalValue={totalValue}
                    onClick={() => setActiveModal(status)}
                />
            )})}
        </div>
      
        <Card className="mb-6">
            <div className="flex items-center justify-between p-4">
                <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
            </div>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Artículo</TableHead>
                                <TableHead>Solicita</TableHead>
                                <TableHead>Fecha Entrega</TableHead>
                                <TableHead className="w-32">Cantidad</TableHead>
                                <TableHead>Valoración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                <TableRow key={item.itemCode + item.orderId}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.solicita}</TableCell>
                                    <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
            </CardHeader>
             <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Hoja Picking</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Contenido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                <TableRow key={order.sheetId}>
                                    <TableCell>
                                        <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                            <Badge variant="secondary">{order.sheetId}</Badge>
                                        </Link>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                    <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

       {activeModal && renderStatusModal(activeModal)}
    </Dialog>
  );
}




```
- src/app/os/bodega/[id]/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BodegaIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bodega`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bodega/page.tsx:
```tsx


'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, Eye, ChevronDown, Save, Loader2, Trash2, FileText } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet, ComercialBriefing, ComercialBriefingItem, ReturnSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type BlockedOrderInfo = {
    sheetId: string;
    status: PickingSheet['status'];
    items: OrderItem[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
}

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);

    useEffect(() => {
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        if (currentBriefing) {
            const sortedItems = [...currentBriefing.items].sort((a, b) => {
                const dateComparison = a.fecha.localeCompare(b.fecha);
                if (dateComparison !== 0) return dateComparison;
                return a.horaInicio.localeCompare(b.horaInicio);
            });
            setBriefingItems(sortedItems);
        }
    }, [osId]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {briefingItems.length > 0 ? briefingItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function BodegaPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

 const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(() => {
    if (typeof window === 'undefined') {
        return { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] }, totalValoracionPendiente: 0 };
    }
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Bodega');

    const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
    const relatedPickingSheets = allPickingSheets.filter(sheet => sheet.osId === osId);

    const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>).filter(s => s.osId === osId);
    
    const mermas: Record<string, number> = {};
    allReturnSheets.forEach(sheet => {
      Object.entries(sheet.itemStates).forEach(([key, state]) => {
        const itemInfo = sheet.items.find(i => `${i.orderId}_${i.itemCode}` === key);
        if (itemInfo && itemInfo.type === 'Bodega' && itemInfo.sentQuantity > state.returnedQuantity) {
            const perdida = itemInfo.sentQuantity - state.returnedQuantity;
            mermas[itemInfo.itemCode] = (mermas[itemInfo.itemCode] || 0) + perdida;
        }
      });
    });
    
    const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
    const processedItemKeys = new Set<string>();
    const blocked: BlockedOrderInfo[] = [];

    relatedPickingSheets.forEach(sheet => {
        const targetStatus = statusMap[sheet.status];
        const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] };

        sheet.items.forEach(itemInSheet => {
            if (itemInSheet.type !== 'Bodega') return;
            
            const uniqueKey = `${itemInSheet.orderId}-${itemInSheet.itemCode}`;
            const orderRef = relatedOrders.find(o => o.id === itemInSheet.orderId);
            const originalItem = orderRef?.items.find(i => i.itemCode === itemInSheet.itemCode);

            if (!originalItem) return;

            let cantidadReal = originalItem.quantity;
            
            const itemWithInfo: ItemWithOrderInfo = {
                ...originalItem, 
                quantity: cantidadReal,
                orderId: sheet.id, 
                orderContract: orderRef?.contractNumber || 'N/A', 
                orderStatus: sheet.status, 
                solicita: orderRef?.solicita,
            };

            statusItems[targetStatus].push(itemWithInfo);
            sheetInfo.items.push(itemWithInfo);

            processedItemKeys.add(uniqueKey);
        });

        if (sheetInfo.items.length > 0) {
            blocked.push(sheetInfo);
        }
    });

    const all = relatedOrders.flatMap(order => 
        order.items.map(item => {
            return {
                ...item, 
                quantity: item.quantity,
                orderId: order.id, 
                contractNumber: order.contractNumber, 
                solicita: order.solicita, 
                tipo: item.tipo, 
                deliveryDate: order.deliveryDate,
                ajustes: item.ajustes
            } as ItemWithOrderInfo
        })
    );
    
    const pending = all.filter(item => {
      const uniqueKey = `${item.orderId}-${item.itemCode}`;
      let cantidadAjustada = item.quantity;
      if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
          cantidadAjustada = Math.max(0, cantidadAjustada - mermas[item.itemCode]);
          mermas[item.itemCode] = 0; // Consume la merma
      }
      return !processedItemKeys.has(uniqueKey) && cantidadAjustada > 0;
    }).map(item => {
        let cantidadAjustada = item.quantity;
        if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            cantidadAjustada = Math.max(0, cantidadAjustada - mermas[item.itemCode]);
        }
        return {...item, quantity: cantidadAjustada};
    });
    
    statusItems['Asignado'] = pending;

    const totalValoracionPendiente = pending.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return { 
        allItems: all, 
        blockedOrders: blocked,
        pendingItems: pending,
        itemsByStatus: statusItems,
        totalValoracionPendiente
    };
  }, [osId, updateTrigger]);
  
    useEffect(() => {
        setIsMounted(true);
        const forceUpdate = () => setUpdateTrigger(prev => prev + 1);
        window.addEventListener('storage', forceUpdate);
        return () => window.removeEventListener('storage', forceUpdate);
    }, []);
  
  const renderStatusModal = (status: StatusColumn) => {
    const items = itemsByStatus[status];
    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map((item, index) => (
                            <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    )
  }
  
    const renderSummaryModal = () => {
    const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
     const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return (
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Resumen de Artículos de Bodega</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Cant. Cajas</TableHead>
                <TableHead>Valoración</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((item, index) => {
                const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                return (
                  <TableRow key={`${item.itemCode}-${index}`}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{cajas}</TableCell>
                    <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                    <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
         <div className="flex justify-end font-bold text-lg p-4">
            Valoración Total: {formatCurrency(totalValue)}
        </div>
      </DialogContent>
    )
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Bodega..." />;
  }

  return (
    <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                </DialogTrigger>
                {renderSummaryModal()}
            </Dialog>
            <BriefingSummaryDialog osId={osId} />
        </div>
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Bodega`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Bodega
          </Link>
        </Button>
      </div>
      
       <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                const items = itemsByStatus[status];
                const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return (
                <StatusCard 
                    key={status}
                    title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                    items={items.length}
                    totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                    totalValue={totalValue}
                    onClick={() => setActiveModal(status)}
                />
            )})}
        </div>
      
        <Card className="mb-6">
            <div className="flex items-center justify-between p-4">
                <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
            </div>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Artículo</TableHead>
                                <TableHead>Solicita</TableHead>
                                <TableHead>Fecha Entrega</TableHead>
                                <TableHead className="w-32">Cantidad</TableHead>
                                <TableHead>Valoración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                <TableRow key={item.itemCode + item.orderId}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.solicita}</TableCell>
                                    <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
            </CardHeader>
             <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Hoja Picking</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Contenido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                <TableRow key={order.sheetId}>
                                    <TableCell>
                                        <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                            <Badge variant="secondary">{order.sheetId}</Badge>
                                        </Link>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                    <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

       {activeModal && renderStatusModal(activeModal)}
    </Dialog>
  );
}



```
- src/app/os/cta-explotacion/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CtaExplotacionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/cta-explotacion`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/decoracion/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DecoracionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/decoracion`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/decoracion/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Flower2 } from 'lucide-react';
import type { DecoracionOrder, ServiceOrder } from '@/types';
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
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';


export default function DecoracionPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [decoracionOrders, setDecoracionOrders] = useState<DecoracionOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);

      const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
      const relatedOrders = allDecoracionOrders.filter(order => order.osId === osId);
      setDecoracionOrders(relatedOrders);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return decoracionOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [decoracionOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
    const updatedOrders = allOrders.filter((o: DecoracionOrder) => o.id !== orderToDelete);
    localStorage.setItem('decoracionOrders', JSON.stringify(updatedOrders));
    setDecoracionOrders(updatedOrders.filter((o: DecoracionOrder) => o.osId === osId));
    
    toast({ title: 'Gasto de decoración eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Decoración..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/decoracion/pedido?osId=${osId}`}>
            <PlusCircle className="mr-2" />
            Nuevo Gasto de Decoración
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Gastos de Decoración Registrados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {decoracionOrders.length > 0 ? (
                          decoracionOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.concepto}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/decoracion/pedido?osId=${osId}&orderId=${order.id}`)}>
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
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                              No hay gastos de decoración para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {decoracionOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto de decoración.
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

```
- src/app/os/gastronomia/[briefingItemId]/layout.tsx:
```tsx

'use client';

// This layout is not strictly necessary but good practice for future modifications
export default function PedidoGastronomiaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

```
- src/app/os/hielo/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HieloIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/hielo`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/hielo/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Snowflake, Phone, Building } from 'lucide-react';
import type { HieloOrder, ServiceOrder } from '@/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';

const statusVariant: { [key in HieloOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En reparto': 'outline',
  Entregado: 'outline',
};

export default function HieloPage() {
  const [hieloOrders, setHieloOrders] = useState<HieloOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!osId) return;

    const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    const relatedOrders = allHieloOrders.filter(order => order.osId === osId);
    setHieloOrders(relatedOrders);

    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return hieloOrders.reduce((sum, order) => sum + order.total, 0);
  }, [hieloOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    const updatedOrders = allOrders.filter((o: HieloOrder) => o.id !== orderToDelete);
    localStorage.setItem('hieloOrders', JSON.stringify(updatedOrders));
    setHieloOrders(updatedOrders.filter((o: HieloOrder) => o.osId === osId));
    
    toast({ title: 'Pedido de hielo eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Hielo..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-8">
        <Button asChild>
          <Link href={`/hielo/pedido?osId=${osId}`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Hielo
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Pedidos de Hielo Realizados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Nº Artículos</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {hieloOrders.length > 0 ? (
                          hieloOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.proveedorNombre}</TableCell>
                              <TableCell>{order.items?.length || 0}</TableCell>
                              <TableCell>{formatCurrency(order.total)}</TableCell>
                              <TableCell>
                              <Badge variant={statusVariant[order.status]}>
                                  {order.status}
                              </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/hielo/pedido?osId=${osId}&orderId=${order.id}`)}>
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
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                              No hay pedidos de hielo para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {hieloOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de hielo.
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

```
- src/app/os/page.tsx:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/os/personal-mice/page.tsx:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function PersonalMiceRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/transporte/pedido/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main OS page as transport is managed within an OS.
export default function TransporteRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/os/transporte/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Truck, Phone, Building } from 'lucide-react';
import type { TransporteOrder, ServiceOrder, Espacio } from '@/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';

const statusVariant: { [key in TransporteOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En Ruta': 'outline',
  Entregado: 'outline',
};

export default function TransportePage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [transporteOrders, setTransporteOrders] = useState<TransporteOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!osId) return;

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    
    if (!currentOS) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio válida.' });
        router.push('/pes');
        return;
    }
    
    setServiceOrder(currentOS);

    if (currentOS?.space) {
        const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
        const currentSpace = allEspacios.find(e => e.identificacion.nombreEspacio === currentOS.space);
        setSpaceAddress(currentSpace?.identificacion.calle || '');
    }

    const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const relatedOrders = allTransporteOrders.filter(order => order.osId === osId);
    setTransporteOrders(relatedOrders);

    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return transporteOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [transporteOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const updatedOrders = allOrders.filter((o: TransporteOrder) => o.id !== orderToDelete);
    localStorage.setItem('transporteOrders', JSON.stringify(updatedOrders));
    setTransporteOrders(updatedOrders.filter((o: TransporteOrder) => o.osId === osId));
    
    toast({ title: 'Pedido de transporte eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Transporte..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/os/${osId}/transporte/pedido`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Transporte
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Pedidos de Transporte Realizados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Recogida</TableHead>
                          <TableHead>Entrega</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {transporteOrders.length > 0 ? (
                          transporteOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.proveedorNombre}</TableCell>
                              <TableCell>{order.tipoTransporte}</TableCell>
                              <TableCell>{order.lugarRecogida} a las {order.horaRecogida}</TableCell>
                              <TableCell>{order.lugarEntrega} a las {order.horaEntrega}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell>
                              <Badge variant={statusVariant[order.status]}>
                                  {order.status}
                              </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/os/${osId}/transporte/pedido?orderId=${order.id}`)}>
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
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                              No hay pedidos de transporte para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {transporteOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de transporte.
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

```
- src/app/os/transporte/pedido/page.tsx:
```tsx

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Truck, Calendar as CalendarIcon, X } from 'lucide-react';
import type { ServiceOrder, TipoTransporte, TransporteOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';

const statusOptions: TransporteOrder['status'][] = ['Pendiente', 'Confirmado', 'En Ruta', 'Entregado'];

const transporteOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  proveedorId: z.string().min(1, 'Debes seleccionar un proveedor'),
  lugarRecogida: z.string().min(1, 'El lugar de recogida es obligatorio'),
  horaRecogida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  lugarEntrega: z.string().min(1, 'El lugar de entrega es obligatorio'),
  horaEntrega: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  observaciones: z.string().optional(),
  status: z.enum(statusOptions).default('Pendiente'),
});

type TransporteOrderFormValues = z.infer<typeof transporteOrderSchema>;

export default function PedidoTransportePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [proveedores, setProveedores] = useState<TipoTransporte[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<TransporteOrderFormValues>({
    resolver: zodResolver(transporteOrderSchema),
    defaultValues: {
      lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
      horaRecogida: '09:00',
      horaEntrega: '10:00',
      status: 'Pendiente',
    }
  });

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const allProveedores = (JSON.parse(localStorage.getItem('tiposTransporte') || '[]') as TipoTransporte[])
        .filter(p => p.tipo === 'Catering');
    setProveedores(allProveedores);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        form.reset({
          ...order,
          observaciones: order.observaciones || '',
          fecha: new Date(order.fecha),
        });
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        fecha: currentOS?.startDate ? new Date(currentOS.startDate) : new Date(),
        proveedorId: '',
        lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
        horaRecogida: '09:00',
        lugarEntrega: currentOS?.spaceAddress || currentOS?.space || '',
        horaEntrega: currentOS?.deliveryTime || '10:00',
        observaciones: '',
        status: 'Pendiente',
      })
    }
    
    setIsMounted(true);
  }, [osId, orderId, form, isEditing]);

  const selectedProviderId = form.watch('proveedorId');
  const selectedProvider = useMemo(() => {
    return proveedores.find(p => p.id === selectedProviderId);
  }, [selectedProviderId, proveedores]);

  const onSubmit = (data: TransporteOrderFormValues) => {
    if (!osId || !selectedProvider) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    
    const finalOrder: Omit<TransporteOrder, 'id' | 'osId'> = {
      fecha: format(data.fecha, 'yyyy-MM-dd'),
      proveedorId: selectedProvider.id,
      proveedorNombre: selectedProvider.nombreProveedor,
      tipoTransporte: selectedProvider.tipoTransporte,
      precio: selectedProvider.precio,
      lugarRecogida: data.lugarRecogida,
      horaRecogida: data.horaRecogida,
      lugarEntrega: data.lugarEntrega,
      horaEntrega: data.horaEntrega,
      observaciones: data.observaciones || '',
      status: data.status,
    };

    if (isEditing) {
      const index = allOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        allOrders[index] = { ...allOrders[index], ...finalOrder };
        toast({ title: "Pedido actualizado" });
      }
    } else {
      allOrders.push({ id: data.id, osId, ...finalOrder });
      toast({ title: "Pedido de transporte creado" });
    }

    localStorage.setItem('transporteOrders', JSON.stringify(allOrders));
    router.push(`/os/${osId}/transporte`);
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Pedido de Transporte..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/transporte`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Truck />{isEditing ? 'Editar' : 'Nuevo'} Pedido de Transporte</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder.serviceNumber}</p>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/os/${osId}/transporte`)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button type="submit"><Save className="mr-2" /> Guardar Pedido</Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha del Servicio</FormLabel>
                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsCalendarOpen(false);}} initialFocus locale={es} />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="proveedorId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor y Tipo de Transporte</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor} - {p.tipoTransporte}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormItem>
                                <FormLabel>Precio</FormLabel>
                                <FormControl>
                                    <Input value={selectedProvider ? selectedProvider.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'N/A'} readOnly />
                                </FormControl>
                            </FormItem>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="lugarRecogida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Recogida</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaRecogida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Recogida</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="lugarEntrega" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Entrega</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaEntrega" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Entrega</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name="observaciones" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Observaciones para la Carga</FormLabel>
                            <FormControl><Textarea {...field} rows={4} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        {isEditing && 
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        }
                    </CardContent>
                </Card>
            </form>
        </Form>
      </main>
    </>
  );
}

```