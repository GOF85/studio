'use client';

import { useState, useMemo, Suspense } from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Euro, PlusCircle, Menu, FileUp, FileDown, Search, Check, X } from "lucide-react";
import { useCostesFijosCPR, useUpsertCosteFijoCPR, useDeleteCosteFijoCPR } from "@/hooks/use-data-queries";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, cn } from "@/lib/utils";
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CostesFijosCprPageContent() {
    const { data: items = [], isLoading } = useCostesFijosCPR();
    const upsertCoste = useUpsertCosteFijoCPR();
    const deleteCoste = useDeleteCosteFijoCPR();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<{ id?: string; concepto: string; importeMensual: number } | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('costes_fijos_cpr')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['costes-fijos-cpr'] });
            setSelectedIds([]);
            setIsBulkDeleteAlertOpen(false);
            toast({ title: 'Costes eliminados correctamente' });
        },
    });

    const filteredItems = useMemo(() => {
        return items.filter((item) =>
            item.concepto.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    const handleToggleSelectAll = () => {
        if (selectedIds.length === filteredItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredItems.map(i => i.id));
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (!editingItem?.concepto || editingItem.importeMensual === undefined) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, completa todos los campos." });
            return;
        }

        try {
            await upsertCoste.mutateAsync(editingItem);
            setIsDialogOpen(false);
            setEditingItem(null);
            toast({ title: editingItem.id ? "Coste actualizado" : "Coste creado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el coste." });
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteCoste.mutateAsync(itemToDelete);
            setIsConfirmDeleteDialogOpen(false);
            setItemToDelete(null);
            toast({ title: "Coste eliminado" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el coste." });
        }
    };

    const mobileColumns: MobileTableColumn<any>[] = [
        {
            key: 'concepto',
            label: 'Concepto',
            isTitle: true,
            format: (value) => (
                <div className="font-medium text-foreground">{value}</div>
            )
        },
        {
            key: 'importeMensual',
            label: 'Importe',
            format: (value) => (
                <div className="text-primary font-semibold">{formatCurrency(value)}</div>
            )
        }
    ];

    if (isLoading) return <LoadingSkeleton />;

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header Premium Sticky */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Euro className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Costes Fijos CPR</h1>
                                <p className="text-sm text-muted-foreground">
                                    Gestiona los costes fijos mensuales para el cálculo del CPR
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                onClick={() => {
                                    setEditingItem({ concepto: '', importeMensual: 0 });
                                    setIsDialogOpen(true);
                                }}
                                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Nuevo Coste
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por concepto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 rounded-full bg-muted/50 border-none focus-visible:ring-primary w-full"
                            />
                        </div>
                        {selectedIds.length > 0 && (
                            <Button 
                                variant="destructive" 
                                onClick={() => setIsBulkDeleteAlertOpen(true)}
                                className="rounded-full shadow-lg animate-in fade-in slide-in-from-right-2"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar ({selectedIds.length})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="rounded-[2rem] border border-border/40 bg-card/50 backdrop-blur-md shadow-xl overflow-hidden">
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border/40">
                                    <TableHead className="w-12">
                                        <Checkbox 
                                            checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                                            onCheckedChange={handleToggleSelectAll}
                                            className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold">Concepto</TableHead>
                                    <TableHead className="font-semibold text-right">Importe Mensual</TableHead>
                                    <TableHead className="w-24 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-primary/5 transition-colors border-b border-border/40 last:border-0">
                                        <TableCell>
                                            <Checkbox 
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={() => handleToggleSelect(item.id)}
                                                className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{item.concepto}</TableCell>
                                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(item.importeMensual)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setIsDialogOpen(true);
                                                    }}
                                                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setItemToDelete(item.id);
                                                        setIsConfirmDeleteDialogOpen(true);
                                                    }}
                                                    className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="md:hidden">
                        <MobileTableView
                            data={filteredItems}
                            columns={mobileColumns}
                            renderActions={(item) => (
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setEditingItem(item);
                                            setIsDialogOpen(true);
                                        }}
                                        className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setItemToDelete(item.id);
                                            setIsConfirmDeleteDialogOpen(true);
                                        }}
                                        className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Diálogos */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {editingItem?.id ? 'Editar Coste' : 'Nuevo Coste'}
                        </DialogTitle>
                        <DialogDescription>
                            Introduce el concepto y el importe mensual del coste fijo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="concepto">Concepto</Label>
                            <Input
                                id="concepto"
                                value={editingItem?.concepto || ''}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, concepto: e.target.value } : null)}
                                className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="importe">Importe Mensual (€)</Label>
                            <Input
                                id="importe"
                                type="number"
                                step="0.01"
                                value={editingItem?.importeMensual || ''}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, importeMensual: parseFloat(e.target.value) } : null)}
                                className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-full">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSave}
                            disabled={upsertCoste.isPending}
                            className="rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        >
                            {upsertCoste.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingItem?.id ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará el coste fijo seleccionado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="rounded-full bg-destructive hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
                <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar {selectedIds.length} elementos?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente los costes fijos seleccionados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                            className="rounded-full bg-destructive hover:bg-destructive/90"
                        >
                            Eliminar todos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function CostesFijosCprPage() {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <CostesFijosCprPageContent />
        </Suspense>
    );
}
