'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Search, 
    Filter, 
    PlusCircle, 
    Menu, 
    Download, 
    Upload, 
    Trash2, 
    AlertCircle 
} from 'lucide-react';
import Papa from 'papaparse';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    DropdownMenu, 
    DropdownMenuTrigger, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
    Tooltip, 
    TooltipTrigger, 
    TooltipContent, 
    TooltipProvider 
} from '@/components/ui/tooltip';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from '@/components/ui/alert-dialog';

import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { PARTIDAS_PRODUCCION } from '@/types';
import { supabase } from '@/lib/supabase';

interface ElaboracionesListProps {
    elaboraciones: any[];
    recetas: any[];
    onDelete: (ids: string[]) => void;
    onClone: (ids: string[]) => void;
}

export function ElaboracionesList({ elaboraciones, recetas, onDelete, onClone }: ElaboracionesListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showOrphansOnly, setShowOrphansOnly] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [importType, setImportType] = useState<'elaboraciones' | 'componentes' | null>(null);

    const activePartida = searchParams ? (searchParams.get('partida') || 'ALL') : 'ALL';

    // Build recipe count map
    const recipeCountMap = useMemo(() => {
        const countMap = new Map<string, { count: number; names: string[] }>();
        recetas.forEach(receta => {
            const elabs = receta.elaboraciones || [];
            elabs.forEach((elab: any) => {
                const id = elab.elaboracionId;
                if (id) {
                    if (!countMap.has(id)) {
                        countMap.set(id, { count: 0, names: [] });
                    }
                    const current = countMap.get(id)!;
                    current.count += 1;
                    if (!current.names.includes(receta.nombre)) {
                        current.names.push(receta.nombre);
                    }
                }
            });
        });
        return countMap;
    }, [recetas]);

    const filtered = useMemo(() => {
        return elaboraciones.filter(i => {
            const matchSearch = i.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchPartida = activePartida !== 'ALL' ? i.partidaProduccion === activePartida : true;
            const matchOrphans = showOrphansOnly ? (recipeCountMap.get(i.id)?.count ?? 0) === 0 : true;
            return matchSearch && matchPartida && matchOrphans;
        });
    }, [elaboraciones, searchTerm, activePartida, showOrphansOnly, recipeCountMap]);

    const isAllSelected = filtered.length > 0 && filtered.every(item => selectedIds.includes(item.id));
    const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

    const handleSelectAll = () => {
        if (isAllSelected) setSelectedIds([]);
        else setSelectedIds(filtered.map(item => item.id));
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handlePartidaChange = (val: string) => {
        const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
        if (val === 'ALL') params.delete('partida');
        else params.set('partida', val);
        router.push(`?${params.toString()}`);
    };

    const handleExportElaboracionesCSV = () => {
        const headers = ["id", "nombre", "produccionTotal", "unidadProduccion", "instruccionesPreparacion", "fotos", "videoProduccionURL", "formatoExpedicion", "ratioExpedicion", "tipoExpedicion", "costePorUnidad", "partidaProduccion"];
        const rows = elaboraciones.map(e => [
            e.id, e.nombre, e.produccionTotal, e.unidadProduccion, e.instruccionesPreparacion, 
            JSON.stringify(e.fotos), e.videoProduccionURL, e.formatoExpedicion, e.ratioExpedicion, 
            e.tipoExpedicion, e.costeUnitario, e.partidaProduccion
        ]);
        const csv = Papa.unparse({ fields: headers, data: rows });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `elaboraciones_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handleExportComponentesCSV = async () => {
        const { data: comps } = await supabase.from('elaboracion_componentes').select('*');
        if (!comps) return;
        const headers = ["id_elaboracion_padre", "tipo_componente", "id_componente", "cantidad", "merma"];
        const rows = comps.map(c => [c.elaboracion_padre_id, c.tipo_componente, c.componente_id, c.cantidad_neta, c.merma_aplicada]);
        const csv = Papa.unparse({ fields: headers, data: rows });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `componentes_elaboraciones_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handleImportClick = (type: 'elaboraciones' | 'componentes') => {
        setImportType(type);
        fileInputRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !importType) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const errors: string[] = [];
                let ignoredRows = 0;

                if (importType === 'elaboraciones') {
                    const mapped = results.data.map((item: any, idx: number) => {
                        if (!item.nombre) { errors.push(`Fila ${idx + 2}: Falta nombre`); ignoredRows++; return null; }
                        return {
                            id: item.id || crypto.randomUUID(),
                            nombre: item.nombre,
                            produccion_total: parseFloat(item.produccionTotal) || 1,
                            unidad_produccion: item.unidadProduccion || 'KG',
                            instrucciones: item.instruccionesPreparacion || '',
                            fotos: item.fotos ? JSON.parse(item.fotos) : [],
                            video_produccion_url: item.videoProduccionURL || '',
                            formato_expedicion: item.formatoExpedicion || '',
                            ratio_expedicion: parseFloat(item.ratioExpedicion) || 0,
                            tipo_expedicion: item.tipoExpedicion || 'REFRIGERADO',
                            coste_unitario: parseFloat(item.costePorUnidad) || 0,
                            partida: item.partidaProduccion || 'FRIO'
                        };
                    }).filter(Boolean);

                    const { error } = await supabase.from('elaboraciones').upsert(mapped);
                    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
                    else toast({ title: 'Importación completada' });
                } else {
                    const mapped = results.data.map((item: any, idx: number) => {
                        const padreId = item.id_elaboracion_padre || item.elaboracion_padre_id;
                        const compId = item.id_componente || item.componente_id;
                        if (!padreId || !compId) { errors.push(`Fila ${idx + 2}: Faltan IDs`); ignoredRows++; return null; }
                        return {
                            elaboracion_padre_id: padreId,
                            tipo_componente: item.tipo_componente || 'ARTICULO',
                            componente_id: compId,
                            cantidad_neta: parseFloat(item.cantidad) || 0,
                            merma_aplicada: parseFloat(item.merma) || 0
                        };
                    }).filter(Boolean);

                    const { error } = await supabase.from('elaboracion_componentes').upsert(mapped);
                    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
                    else toast({ title: 'Importación completada' });
                }
                router.refresh();
            }
        });
        if (event.target) event.target.value = '';
        setImportType(null);
    };

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelected} />

                <div className="flex flex-col gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
                    <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center justify-between">
                        <div className="flex flex-1 gap-2 w-full max-w-2xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar elaboración..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    className="pl-9 h-9 text-sm bg-background"
                                />
                            </div>
                            <div className="w-[180px]">
                                <Select value={activePartida} onValueChange={handlePartidaChange}>
                                    <SelectTrigger className="h-9">
                                        <div className="flex items-center gap-2 truncate">
                                            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                            <SelectValue placeholder="Partida" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todas las partidas</SelectItem>
                                        {PARTIDAS_PRODUCCION.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant={showOrphansOnly ? "default" : "outline"}
                                size="sm"
                                className={`h-9 text-xs px-3 ${showOrphansOnly ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                                onClick={() => setShowOrphansOnly(!showOrphansOnly)}
                            >
                                Huérfanas{showOrphansOnly && ` (${filtered.length})`}
                            </Button>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9">
                                        <Menu className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Acciones CSV</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleExportElaboracionesCSV}><Download className="mr-2 h-4 w-4"/> Exportar Elaboraciones</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportComponentesCSV}><Download className="mr-2 h-4 w-4"/> Exportar Componentes</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleImportClick('elaboraciones')}><Upload className="mr-2 h-4 w-4"/> Importar Elaboraciones</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleImportClick('componentes')}><Upload className="mr-2 h-4 w-4"/> Importar Componentes</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button onClick={() => router.push('/book/elaboraciones/nueva')} className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none shadow-sm h-9">
                                <PlusCircle className="mr-2 h-4 w-4"/> 
                                <span className="hidden sm:inline">Nueva Elaboración</span>
                                <span className="sm:hidden">Nueva</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* VISTA MÓVIL */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                    {filtered.map(item => (
                        <div 
                            key={item.id} 
                            className={`bg-card border-l-4 rounded-lg p-3 shadow-sm active:scale-[0.98] transition-all group ${item.requiereRevision ? 'border-l-amber-500 border-r border-t border-b border-amber-200 bg-amber-50/30' : 'border-l-primary/20 border-r border-t border-b'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="checkbox"
                                        className="accent-blue-600 h-4 w-4 align-middle cursor-pointer"
                                        checked={selectedIds.includes(item.id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleSelectOne(item.id);
                                        }}
                                    />
                                    <span 
                                        className="font-bold text-sm text-foreground group-hover:text-primary transition-colors cursor-pointer flex-1"
                                        onClick={() => router.push(`/book/elaboraciones/${item.id}`)}
                                    >
                                        {item.nombre}
                                    </span>
                                    {item.requiereRevision && <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <Menu className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>Abrir</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onClone([item.id])}>Clonar</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => {
                                            setSelectedIds([item.id]);
                                            setShowBulkDeleteConfirm(true);
                                        }}>Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>{formatCurrency(item.costeUnitario)} / {formatUnit(item.unidadProduccion)}</span>
                                <div className="flex items-center gap-2">
                                    {recipeCountMap.get(item.id) && recipeCountMap.get(item.id)!.count > 0 && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal cursor-pointer hover:bg-primary/10">
                                                    {recipeCountMap.get(item.id)!.count} receta{recipeCountMap.get(item.id)!.count !== 1 ? 's' : ''}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs">
                                                <div className="space-y-1">
                                                    {recipeCountMap.get(item.id)!.names.map((name, idx) => (
                                                        <div key={idx} className="text-xs">{name}</div>
                                                    ))}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">{item.partidaProduccion}</Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* VISTA DESKTOP */}
                <div className="hidden md:block">
                    {selectedIds.length > 0 && (
                        <div className="flex justify-end gap-2 mb-2">
                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs shadow" onClick={() => onClone(selectedIds)}>
                                📋 Clonar ({selectedIds.length})
                            </Button>
                            <Button variant="destructive" size="sm" className="h-8 px-3 text-xs shadow" onClick={() => setShowBulkDeleteConfirm(true)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Borrar ({selectedIds.length})
                            </Button>
                        </div>
                    )}
                    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-8 pl-2 pr-1 align-middle">
                                        <input
                                            type="checkbox"
                                            className="accent-blue-600 h-4 w-4 align-middle"
                                            checked={isAllSelected}
                                            ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                            onChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Partida</TableHead>
                                    <TableHead className="text-right">Coste / Ud.</TableHead>
                                    <TableHead className="text-center">Recetas</TableHead>
                                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(item => (
                                    <TableRow key={item.id} className={`${selectedIds.includes(item.id) ? "bg-blue-50/40" : item.requiereRevision ? "bg-amber-50/40 hover:bg-amber-50/60" : "cursor-pointer hover:bg-muted/50"} group transition-colors`}>
                                        <TableCell className="w-8 pl-2 pr-1 align-middle">
                                            <input
                                                type="checkbox"
                                                className="accent-blue-600 h-4 w-4 align-middle cursor-pointer"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => handleSelectOne(item.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>
                                            <div className="flex items-center gap-2">
                                                <span>{item.nombre}</span>
                                                {item.requiereRevision && <AlertCircle className="h-4 w-4 text-amber-600" />}
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => router.push(`/book/elaboraciones/${item.id}`)}><Badge variant="outline" className="font-normal">{item.partidaProduccion}</Badge></TableCell>
                                        <TableCell className="text-right font-mono text-sm" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{formatCurrency(item.costeUnitario)} / {formatUnit(item.unidadProduccion)}</TableCell>
                                        <TableCell className="text-center">
                                            {recipeCountMap.get(item.id) && recipeCountMap.get(item.id)!.count > 0 ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="text-xs px-2 py-1 font-normal cursor-pointer hover:bg-primary/10">
                                                            {recipeCountMap.get(item.id)!.count}
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-xs">
                                                        <div className="space-y-1">
                                                            {recipeCountMap.get(item.id)!.names.map((name, idx) => (
                                                                <div key={idx} className="text-xs">{name}</div>
                                                            ))}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Menu className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>Abrir</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onClone([item.id])}>Clonar</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => {
                                                        setSelectedIds([item.id]);
                                                        setShowBulkDeleteConfirm(true);
                                                    }}>Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar seleccionados?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción eliminará todas las elaboraciones seleccionadas. ¿Desea continuar?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { onDelete(selectedIds); setSelectedIds([]); setShowBulkDeleteConfirm(false); }} className="bg-destructive">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}
