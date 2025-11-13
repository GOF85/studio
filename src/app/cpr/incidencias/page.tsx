

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion, IncidenciaInventario } from '@/types';
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
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

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
                        <TableCell className="max-w-xs truncate">{of.incidenciaObservaciones}</TableCell>
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

    useEffect(() => {
        const storedData = localStorage.getItem('incidenciasInventario');
        if (storedData) {
            setIncidencias(JSON.parse(storedData));
        }
    }, []);

    const filteredItems = useMemo(() => {
        return incidencias.filter(item =>
            item.descripcionLibre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.zona.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [incidencias, searchTerm]);

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
                        <TableHead>Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell>{item.zona}</TableCell>
                            <TableCell>{item.responsable}</TableCell>
                            <TableCell>{item.descripcionLibre}</TableCell>
                            <TableCell>{item.cantidadContada}</TableCell>
                            <TableCell>
                                {item.fotoUrl && (
                                    <Dialog>
                                        <DialogTrigger asChild><Button variant="outline" size="sm">Ver Foto</Button></DialogTrigger>
                                        <DialogContent>
                                            <img src={item.fotoUrl} alt="Incidencia" className="max-w-full h-auto rounded-md" />
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant={item.estado === 'RESUELTA' ? 'default' : 'destructive'}>{item.estado}</Badge>
                            </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                        No hay incidencias de inventario registradas.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </div>
    )
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
