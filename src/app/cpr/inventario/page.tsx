
'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, Search, SlidersHorizontal, FileDown, FileUp, PlusCircle, Activity, X, Save, Loader2, Trash2 } from 'lucide-react';
import type { ArticuloERP, StockArticuloUbicacion, Ubicacion, CentroProduccion, IncidenciaInventario, Proveedor } from '@/types';
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
                <Input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
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
                <h2 className="text-2xl font-semibold tracking-tight">Stock Teórico Consolidado</h2>
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

    