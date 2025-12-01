'use client';

import { useState, useEffect } from 'react';
import { Database, Save, PlusCircle, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
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

