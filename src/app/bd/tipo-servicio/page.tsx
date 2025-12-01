'use client';

import { useState, useEffect } from 'react';
import { Database, Save, PlusCircle, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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

type TipoServicio = {
    id: string;
    nombre: string;
    descripcion?: string;
    created_at?: string;
};

export default function TipoServicioPage() {
    const [items, setItems] = useState<TipoServicio[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<TipoServicio | null>(null);
    const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const { data, error } = await supabase
                .from('tipos_servicio_briefing')
                .select('*')
                .order('nombre');

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            setItems(data || []);
        } catch (error: any) {
            console.error('Error loading data:', error);
            const errorMessage = error?.message || error?.error_description || 'Error al cargar los tipos de servicio.';
            toast({
                variant: 'destructive',
                title: 'Error',
                description: errorMessage
            });
        } finally {
            setIsLoading(false);
        }
    }

    function handleOpenDialog(item?: TipoServicio) {
        if (item) {
            setEditingItem(item);
            setFormData({ nombre: item.nombre, descripcion: item.descripcion || '' });
        } else {
            setEditingItem(null);
            setFormData({ nombre: '', descripcion: '' });
        }
        setIsDialogOpen(true);
    }

    async function handleSave() {
        if (!formData.nombre.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre es obligatorio.' });
            return;
        }

        setIsSaving(true);
        try {
            if (editingItem) {
                // Update
                const { error } = await supabase
                    .from('tipos_servicio_briefing')
                    .update({
                        nombre: formData.nombre.trim(),
                        descripcion: formData.descripcion.trim() || null
                    })
                    .eq('id', editingItem.id);

                if (error) throw error;
                toast({ title: 'Actualizado', description: 'Tipo de servicio actualizado correctamente.' });
            } else {
                // Create
                const { error } = await supabase
                    .from('tipos_servicio_briefing')
                    .insert({
                        nombre: formData.nombre.trim(),
                        descripcion: formData.descripcion.trim() || null
                    });

                if (error) throw error;
                toast({ title: 'Creado', description: 'Tipo de servicio creado correctamente.' });
            }

            setIsDialogOpen(false);
            setFormData({ nombre: '', descripcion: '' });
            setEditingItem(null);
            loadData();
        } catch (error) {
            console.error('Error saving:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al guardar el tipo de servicio.' });
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!itemToDelete) return;

        try {
            const { error } = await supabase
                .from('tipos_servicio_briefing')
                .delete()
                .eq('id', itemToDelete);

            if (error) throw error;

            toast({ title: 'Eliminado', description: 'Tipo de servicio eliminado correctamente.' });
            setItemToDelete(null);
            loadData();
        } catch (error) {
            console.error('Error deleting:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al eliminar el tipo de servicio.' });
        }
    }

    if (isLoading) {
        return <LoadingSkeleton title="Cargando Tipos de Servicio..." />;
    }

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Database className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">Tipos de Servicio de Briefing</h1>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2" /> Nuevo Tipo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar' : 'Nuevo'} Tipo de Servicio</DialogTitle>
                            <DialogDescription>
                                {editingItem ? 'Modifica' : 'Crea'} un tipo de servicio para el briefing.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label htmlFor="nombre" className="text-sm font-medium">
                                    Nombre *
                                </label>
                                <Input
                                    id="nombre"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Desayuno, Comida, Cena..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="descripcion" className="text-sm font-medium">
                                    Descripción
                                </label>
                                <Input
                                    id="descripcion"
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Descripción opcional"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right w-24">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nombre}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.descripcion || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenDialog(item)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                onClick={() => setItemToDelete(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No hay tipos de servicio. Crea uno nuevo.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el tipo de servicio.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
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
