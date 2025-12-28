'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Trash2, Search, Calendar, Users, Briefcase, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useEventos } from '@/hooks/use-data-queries';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tables linked by os_id
const TABLES_WITH_OS_ID = [
    'comercial_briefings',
    'comercial_ajustes',
    'gastronomia_orders',
    'material_orders',
    'pedidos_transporte',
    'pedidos_hielo',
    'pedidos_decoracion',
    'atipico_orders',
    'pruebas_menu',
    'hojas_picking',
    'hojas_retorno',
    'cta_real_costs',
    'cta_comentarios',
    'os_mermas',
    'os_devoluciones',
    'personal_mice_asignaciones',
];

// Tables linked by evento_id
const TABLES_WITH_EVENTO_ID = [
    'personal_externo_eventos',
    'personal_externo_ajustes'
];

export default function ServiceOrdersPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: eventos, isLoading, refetch } = useEventos();
    const { toast } = useToast();
    const router = useRouter();

    // We handle deletion manually to ensure cascade
    const performCascadingDelete = async (ids: string[]) => {
        setIsDeleting(true);
        let successCount = 0;
        let errorCount = 0;

        for (const id of ids) {
            try {
                // 1. Resolve UUID if needed (some IDs might be expediente number)
                // Ideally we work with UUIDs. useEventos returns UUID as id.

                // 2. Delete from tables with os_id
                await Promise.all(TABLES_WITH_OS_ID.map(table =>
                    supabase.from(table).delete().eq('os_id', id)
                ));

                // 3. Delete from tables with evento_id
                await Promise.all(TABLES_WITH_EVENTO_ID.map(table =>
                    supabase.from(table).delete().eq('evento_id', id)
                ));

                // 4. Delete the event itself
                const { error } = await supabase.from('eventos').delete().eq('id', id);
                if (error) throw error;

                successCount++;
            } catch (error) {
                console.error(`Error deleting event ${id}:`, error);
                errorCount++;
            }
        }

        setIsDeleting(false);

        if (successCount > 0) {
            toast({
                title: 'Borrado completado',
                description: `Se han eliminado ${successCount} órdenes de servicio y sus datos asociados.`,
            });
            refetch();
            setSelectedIds(new Set());
        }

        if (errorCount > 0) {
            toast({
                variant: 'destructive',
                title: 'Errores durante el borrado',
                description: `No se pudieron eliminar ${errorCount} registros. Revisa la consola para más detalles.`,
            });
        }
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const filteredEventos = useMemo(() => {
        if (!eventos) return [];
        if (!searchTerm) return eventos;

        const lowerSearch = searchTerm.toLowerCase();
        return eventos.filter(evento =>
            evento.serviceNumber.toLowerCase().includes(lowerSearch) ||
            evento.client.toLowerCase().includes(lowerSearch) ||
            (evento.finalClient && evento.finalClient.toLowerCase().includes(lowerSearch))
        );
    }, [eventos, searchTerm]);

    const handleToggleAll = (checked: boolean | 'indeterminate') => {
        if (checked === 'indeterminate') return;
        if (checked) {
            setSelectedIds(new Set(filteredEventos.map(e => e.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleToggleItem = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleDeleteSingle = async () => {
        if (itemToDelete) {
            await performCascadingDelete([itemToDelete]);
            setItemToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        await performCascadingDelete(Array.from(selectedIds));
        setIsBulkDeleteConfirmOpen(false);
    };

    if (!isMounted || isLoading) {
        return <LoadingSkeleton title="Cargando Órdenes de Servicio..." />;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 rounded-[2rem] bg-primary/10 text-primary shadow-inner">
                            <FileText className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-foreground">Órdenes de Servicio</h1>
                            <p className="text-sm font-medium text-muted-foreground/70">Gestión y eliminación de expedientes</p>
                        </div>
                    </div>

                    <div className="relative flex-1 max-w-md w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Buscar por expediente, cliente..."
                            className="pl-12 h-12 bg-background/40 border-border/40 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-border/40 h-16">
                            <TableHead className="w-16 text-center">
                                <Checkbox
                                    checked={selectedIds.size === filteredEventos.length && filteredEventos.length > 0 ? true : selectedIds.size > 0 ? 'indeterminate' : false}
                                    onCheckedChange={handleToggleAll}
                                    className="rounded-lg h-5 w-5 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Expediente</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Cliente / Evento</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Fecha</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Estado</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Pax</TableHead>
                            <TableHead className="w-16"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEventos.length > 0 ? (
                            filteredEventos.map(evento => {
                                const isSelected = selectedIds.has(evento.id);
                                return (
                                    <TableRow
                                        key={evento.id}
                                        className={cn(
                                            "group transition-all duration-300 border-border/40 h-20 hover:bg-muted/30",
                                            isSelected && "bg-primary/5 border-l-4 border-l-primary"
                                        )}
                                    >
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleItem(evento.id)}
                                                className="rounded-lg h-5 w-5 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-mono font-bold text-xs bg-background/50">
                                                    {evento.serviceNumber}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                    {evento.client}
                                                </span>
                                                {evento.finalClient && evento.finalClient !== evento.client && (
                                                    <span className="text-xs text-muted-foreground">
                                                        para {evento.finalClient}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-0.5">
                                                    {evento.vertical || 'Catering'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                <Calendar className="h-4 w-4 opacity-50" />
                                                {evento.startDate ? format(new Date(evento.startDate), 'd MMM yyyy', { locale: es }) : '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={evento.status === 'Confirmado' ? 'default' : 'secondary'}
                                                className={cn(
                                                    "uppercase tracking-wider font-bold text-[10px]",
                                                    evento.status === 'Confirmado' && "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20",
                                                    evento.status === 'Borrador' && "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20",
                                                    evento.status === 'Anulado' && "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20"
                                                )}
                                            >
                                                {evento.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex items-center justify-end gap-2 font-mono font-bold text-muted-foreground">
                                                <Users className="h-4 w-4 opacity-50" />
                                                {evento.asistentes || 0}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setItemToDelete(evento.id)}
                                                className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                                        <FileText className="h-12 w-12 mb-3 opacity-10" />
                                        <p className="font-bold text-sm uppercase tracking-widest">No se encontraron eventos</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Floating Bulk Action */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-background/80 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-4 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-primary/10 text-primary">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-black tracking-tight">
                            {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="h-6 w-px bg-border/40" />
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsBulkDeleteConfirmOpen(true)}
                        className="rounded-xl font-bold shadow-lg shadow-destructive/20 active:scale-95 transition-all"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Selección
                    </Button>
                </div>
            )}

            {/* Single Delete Alert */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Orden de Servicio?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminará la OS y <strong>todos sus datos asociados</strong> (briefings, pedidos, personal, etc). Esta acción es irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
                            onClick={handleDeleteSingle}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar todo'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Alert */}
            <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar {selectedIds.size} eventos?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminarán {selectedIds.size} órdenes de servicio y <strong>todos sus datos asociados</strong>. Esta acción es irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} onClick={() => setIsBulkDeleteConfirmOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar selección'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
