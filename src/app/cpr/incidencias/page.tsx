

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion, IncidenciaInventario, ArticuloERP, Ubicacion } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';


const partidas: PartidaProduccion[] = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'];

function IncidenciasProduccion() {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [partidaFilter, setPartidaFilter] = useState('all');
    const router = useRouter();

    useEffect(() => {
        const storedData = localStorage.getItem('ordenesFabricacion');
        if (storedData) {
            const allOFs = JSON.parse(storedData) as OrdenFabricacion[];
            setOrdenes(allOFs.filter(of => of.estado === 'Incidencia'));
        }
    }, []);

    const filteredItems = useMemo(() => {
        return ordenes.filter(item => {
        const searchMatch = searchTerm === '' || 
                            item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.responsable || '').toLowerCase().includes(searchTerm.toLowerCase());
        const partidaMatch = partidaFilter === 'all' || item.partidaAsignada === partidaFilter;
        return searchMatch && partidaMatch;
        });
    }, [ordenes, searchTerm, partidaFilter]);

    return (
        <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por Lote, Elaboración o Responsable..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <Select value={partidaFilter} onValueChange={setPartidaFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filtrar por partida" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Partidas</SelectItem>
                        {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-lg">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Lote / OF</TableHead>
                    <TableHead>Elaboración</TableHead>
                    <TableHead>Fecha Prevista</TableHead>
                    <TableHead>Partida</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Observaciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredItems.length > 0 ? (
                    filteredItems.map(of => (
                        <TableRow
                        key={of.id}
                        onClick={() => router.push(`/cpr/of/${of.id}`)}
                        className="cursor-pointer hover:bg-destructive/10"
                        >
                        <TableCell className="font-medium font-mono">{of.id}</TableCell>
                        <TableCell>{of.elaboracionNombre}</TableCell>
                        <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                        <TableCell><Badge variant="secondary">{of.partidaAsignada}</Badge></TableCell>
                        <TableCell>{of.responsable}</TableCell>
                        <TableCell className="max-w-xs truncate">{of.observacionesIncidencia}</TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                        No hay incidencias de producción registradas con los filtros seleccionados.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </div>
    )
}

function IncidenciasInventario() {
    const [incidencias, setIncidencias] = useState<IncidenciaInventario[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [allArticulos, setAllArticulos] = useState<ArticuloERP[]>([]);
    const [allUbicaciones, setAllUbicaciones] = useState<Ubicacion[]>([]);
    const [resolvingIncident, setResolvingIncident] = useState<IncidenciaInventario | null>(null);
    const [selectedArticuloId, setSelectedArticuloId] = useState<string | null>(null);
    const [showMermaDialog, setShowMermaDialog] = useState(false);
    const [mermaValor, setMermaValor] = useState('');
    const [isAssigningDialogOpen, setIsAssigningDialogOpen] = useState(false);
    const [assignmentData, setAssignmentData] = useState<{cantidadCompra: string, cantidadBase: string}>({cantidadCompra: '', cantidadBase: ''});

    
    const { toast } = useToast();

    const loadData = () => {
        const storedData = (JSON.parse(localStorage.getItem('incidenciasInventario') || '[]') as IncidenciaInventario[]).filter(i => i.estado === 'PENDIENTE_IDENTIFICACION');
        setIncidencias(storedData);
        
        const storedArticulos = (JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[]);
        setAllArticulos(storedArticulos);
        
        const storedUbicaciones = (JSON.parse(localStorage.getItem('ubicaciones') || '[]') as Ubicacion[]);
        setAllUbicaciones(storedUbicaciones);
    };

    useEffect(() => {
        loadData();
    }, []);
    
    const selectedArticulo = useMemo(() => {
        return allArticulos.find(a => a.idreferenciaerp === selectedArticuloId);
    }, [selectedArticuloId, allArticulos]);

    useEffect(() => {
        if(selectedArticulo) {
            const cantidadNum = parseFloat(assignmentData.cantidadCompra.replace(',', '.'));
            if (!isNaN(cantidadNum)) {
                setAssignmentData(prev => ({
                    ...prev,
                    cantidadBase: String(cantidadNum * (selectedArticulo.unidadConversion || 1))
                }));
            }
        }
    }, [selectedArticulo, assignmentData.cantidadCompra]);

    const filteredItems = useMemo(() => {
        return incidencias.filter(item =>
            item.descripcionLibre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.zona.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [incidencias, searchTerm]);
    
    const ubicacionMap = useMemo(() => new Map(allUbicaciones.map(u => [u.id, u.nombre])), [allUbicaciones]);
    const articuloOptions = useMemo(() => allArticulos.map(a => ({ label: a.nombreProductoERP, value: a.idreferenciaerp! })), [allArticulos]);

    const handleOpenAssignDialog = () => {
        if (!resolvingIncident || !selectedArticuloId) return;
        setAssignmentData({ cantidadCompra: '', cantidadBase: '' });
        setIsAssigningDialogOpen(true);
    };

    const handleAsignar = () => {
        if (!resolvingIncident || !selectedArticuloId) return;

        const allStock = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}');
        const stockKey = `${selectedArticuloId}_${resolvingIncident.zona}`;

        if (!allStock[stockKey]) {
            allStock[stockKey] = {
                id: stockKey, articuloErpId: selectedArticuloId, ubicacionId: resolvingIncident.zona,
                stockTeorico: 0, lotes: []
            };
        }
        
        const cantidadNumerica = parseFloat(assignmentData.cantidadBase.replace(',', '.')) || 0;
        allStock[stockKey].stockTeorico += cantidadNumerica;
        
        localStorage.setItem('stockArticuloUbicacion', JSON.stringify(allStock));

        const allIncidencias = JSON.parse(localStorage.getItem('incidenciasInventario') || '[]') as IncidenciaInventario[];
        const index = allIncidencias.findIndex(i => i.id === resolvingIncident.id);
        if (index > -1) {
            allIncidencias[index].estado = 'RESUELTA';
            allIncidencias[index].articuloErpVinculado = selectedArticuloId;
            localStorage.setItem('incidenciasInventario', JSON.stringify(allIncidencias));
        }

        toast({ title: 'Incidencia Resuelta', description: 'El stock ha sido actualizado.' });
        setResolvingIncident(null);
        setSelectedArticuloId(null);
        setIsAssigningDialogOpen(false);
        loadData();
    };

    const handleDescartar = () => {
        const valor = parseFloat(mermaValor);
        if (!resolvingIncident || isNaN(valor) || valor <= 0) {
            toast({variant: 'destructive', title: 'Error', description: 'Debes introducir una valoración económica válida.'});
            return;
        }
        
        const allIncidencias = JSON.parse(localStorage.getItem('incidenciasInventario') || '[]') as IncidenciaInventario[];
        const index = allIncidencias.findIndex(i => i.id === resolvingIncident.id);
        if (index > -1) {
            allIncidencias[index].estado = 'DESCARTADA';
            allIncidencias[index].valoracionMerma = valor;
            localStorage.setItem('incidenciasInventario', JSON.stringify(allIncidencias));
        }
        
        toast({ title: 'Incidencia Descartada', description: 'Se ha registrado la merma.' });
        setResolvingIncident(null);
        setShowMermaDialog(false);
        setMermaValor('');
        loadData();
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por descripción, zona o responsable..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
            </div>

            <div className="border rounded-lg">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Zona</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Foto</TableHead>
                        <TableHead className="text-center">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell>{ubicacionMap.get(item.zona) || item.zona}</TableCell>
                            <TableCell>{item.responsable}</TableCell>
                            <TableCell>{item.descripcionLibre}</TableCell>
                            <TableCell>{item.cantidadContada}</TableCell>
                            <TableCell>
                                {item.fotoUrl && (
                                    <Dialog>
                                        <DialogTrigger asChild><Button variant="outline" size="sm">Ver Foto</Button></DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Foto de la Incidencia</DialogTitle>
                                            </DialogHeader>
                                            <img src={item.fotoUrl} alt="Incidencia" className="max-w-full h-auto rounded-md" />
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </TableCell>
                            <TableCell className="text-center">
                                <Button size="sm" onClick={() => setResolvingIncident(item)}>Resolver</Button>
                            </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                        No hay incidencias de inventario pendientes.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
            
            <Dialog open={!!resolvingIncident && !isAssigningDialogOpen} onOpenChange={() => setResolvingIncident(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolver Incidencia de Inventario</DialogTitle>
                        <DialogDescription>
                            Asigna este artículo no identificado a un producto del ERP o descártalo como merma.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {resolvingIncident?.fotoUrl && (
                            <img src={resolvingIncident.fotoUrl} alt="Incidencia" className="max-w-xs mx-auto rounded-md" />
                        )}
                        <p><strong>Descripción:</strong> {resolvingIncident?.descripcionLibre}</p>
                        <p><strong>Cantidad Contada:</strong> {resolvingIncident?.cantidadContada}</p>
                        <p><strong>Zona:</strong> {ubicacionMap.get(resolvingIncident?.zona || '')}</p>

                        <div className="space-y-2 pt-4 border-t">
                            <Label htmlFor="articulo-selector">Asignar a artículo ERP</Label>
                            <Combobox
                                options={articuloOptions}
                                value={selectedArticuloId || ''}
                                onChange={setSelectedArticuloId}
                                placeholder="Buscar artículo..."
                            />
                        </div>
                    </div>
                    <DialogFooter className="justify-between">
                         <AlertDialog open={showMermaDialog} onOpenChange={setShowMermaDialog}>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">Declarar Merma</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Valorar Merma</AlertDialogTitle>
                                    <AlertDialogDescription>Introduce un valor económico estimado para este producto descartado.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="valor-merma">Valoración de la merma (€)</Label>
                                    <Input id="valor-merma" type="number" step="0.01" value={mermaValor} onChange={e => setMermaValor(e.target.value)} />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDescartar}>Confirmar Merma</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button onClick={handleOpenAssignDialog} disabled={!selectedArticuloId}>Asignar y Resolver</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isAssigningDialogOpen} onOpenChange={setIsAssigningDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Cantidad a Añadir</DialogTitle>
                        <DialogDescription>
                            Introduce la cantidad en la unidad de compra (ej. cajas) o directamente en la unidad base.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p><strong>Producto:</strong> {selectedArticulo?.nombreProductoERP}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cantidad Compra (ej. Cajas)</Label>
                                <Input type="number" value={assignmentData.cantidadCompra} onChange={e => setAssignmentData(prev => ({...prev, cantidadCompra: e.target.value}))}/>
                                <p className="text-xs text-muted-foreground">Formato compra: {selectedArticulo?.unidadConversion || 1} {selectedArticulo?.unidad}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Cantidad a Añadir ({selectedArticulo?.unidad})</Label>
                                <Input type="number" value={assignmentData.cantidadBase} onChange={e => setAssignmentData(prev => ({...prev, cantidadBase: e.target.value}))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsAssigningDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAsignar}>Confirmar y Añadir a Stock</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function IncidenciasPage() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Informe de Incidencias..." />;
    }

    return (
        <main>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><AlertTriangle />Incidencias</h1>
            </div>

            <Tabs defaultValue="produccion">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="produccion">Incidencias de Producción</TabsTrigger>
                    <TabsTrigger value="inventario">Incidencias de Inventario</TabsTrigger>
                </TabsList>
                <TabsContent value="produccion" className="mt-4">
                    <IncidenciasProduccion />
                </TabsContent>
                <TabsContent value="inventario" className="mt-4">
                    <IncidenciasInventario />
                </TabsContent>
            </Tabs>
        </main>
    );
}
