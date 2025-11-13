
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, PlusCircle, Trash2, Pencil } from 'lucide-react';
import type { CentroProduccion } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
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


function CentroModal({ open, onOpenChange, onSave, initialData }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (data: Omit<CentroProduccion, 'id'> & {id: string}) => void; initialData?: Partial<CentroProduccion> }) {
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [tipo, setTipo] = useState<'Central' | 'Satelite' | 'Evento Temporal'>('Central');
    const [id, setId] = useState('');

    useEffect(() => {
        if (open) {
            setId(initialData?.id || '');
            setNombre(initialData?.nombre || '');
            setDireccion(initialData?.direccion || '');
            setTipo(initialData?.tipo || 'Central');
        }
    }, [initialData, open]);
    
    const handleSave = () => {
        if (!nombre || !id) {
            alert('El ID y el nombre son obligatorios');
            return;
        }
        onSave({ id, nombre, direccion, tipo });
        onOpenChange(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Editar' : 'Nuevo'} Centro de Producción</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="id-centro">ID (ej. CPR_MAD)</Label>
                        <Input id="id-centro" value={id} onChange={e => setId(e.target.value.toUpperCase())} readOnly={!!initialData?.id} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="nombre-centro">Nombre Descriptivo</Label>
                        <Input id="nombre-centro" value={nombre} onChange={e => setNombre(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="direccion-centro">Dirección</Label>
                        <Input id="direccion-centro" value={direccion} onChange={e => setDireccion(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="tipo-centro">Tipo</Label>
                        <Select onValueChange={(v) => setTipo(v as any)} value={tipo}>
                            <SelectTrigger id="tipo-centro"><SelectValue /></SelectTrigger>
                            <SelectContent>
                               <SelectItem value="Central">Central</SelectItem>
                               <SelectItem value="Satelite">Satélite</SelectItem>
                               <SelectItem value="Evento Temporal">Evento Temporal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function CentrosPage() {
    const [centros, setCentros] = useState<CentroProduccion[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCentro, setEditingCentro] = useState<Partial<CentroProduccion> | null>(null);
    const [centroToDelete, setCentroToDelete] = useState<string | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        setCentros(JSON.parse(localStorage.getItem('centros') || '[]'));
        setIsMounted(true);
    }, []);

    const handleSave = (data: Omit<CentroProduccion, 'id'> & {id: string}) => {
        let updatedCentros = [...centros];
        if (editingCentro?.id) { // Editing
            const index = centros.findIndex(c => c.id === editingCentro.id);
            if (index > -1) {
                updatedCentros[index] = { ...editingCentro, ...data } as CentroProduccion;
                toast({ title: 'Centro actualizado' });
            }
        } else { // Creating
            if(centros.some(c => c.id === data.id)) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un centro con ese ID.' });
                 return;
            }
            updatedCentros.push(data);
            toast({ title: 'Centro creado' });
        }
        
        localStorage.setItem('centros', JSON.stringify(updatedCentros));
        setCentros(updatedCentros);
    };
    
    const handleDelete = () => {
        if(!centroToDelete) return;
        const updatedCentros = centros.filter(c => c.id !== centroToDelete);
        localStorage.setItem('centros', JSON.stringify(updatedCentros));
        setCentros(updatedCentros);
        setCentroToDelete(null);
        toast({title: 'Centro eliminado'});
    }
    
    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Centros..." />;
    }

    return (
        <>
            <div className="flex items-center justify-end mb-6">
                <Button onClick={() => { setEditingCentro(null); setIsModalOpen(true); }}><PlusCircle className="mr-2" />Nuevo Centro</Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Dirección</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {centros.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono">{item.id}</TableCell>
                                <TableCell className="font-semibold">{item.nombre}</TableCell>
                                <TableCell>{item.direccion}</TableCell>
                                <TableCell>{item.tipo}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingCentro(item); setIsModalOpen(true); }}><Pencil className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setCentroToDelete(item.id)}><Trash2 className="h-4 w-4"/></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            <CentroModal 
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSave={handleSave}
                initialData={editingCentro}
            />
            
            <AlertDialog open={!!centroToDelete} onOpenChange={() => setCentroToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Centro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer y podría afectar a las ubicaciones asociadas.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
