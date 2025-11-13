
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, PlusCircle, Trash2, Pencil } from 'lucide-react';
import type { Ubicacion, CentroProduccion } from '@/types';
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
import { Checkbox } from '@/components/ui/checkbox';
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


function UbicacionModal({ open, onOpenChange, onSave, centros, initialData }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (data: Omit<Ubicacion, 'id'>) => void; centros: CentroProduccion[], initialData?: Partial<Ubicacion> }) {
    const [nombre, setNombre] = useState('');
    const [centroId, setCentroId] = useState('');
    const [esZonaPicking, setEsZonaPicking] = useState(false);
    const [descripcion, setDescripcion] = useState('');

    useEffect(() => {
        if (open) {
            setNombre(initialData?.nombre || '');
            setCentroId(initialData?.centroId || '');
            setEsZonaPicking(initialData?.esZonaPicking || false);
            setDescripcion(initialData?.descripcion || '');
        }
    }, [initialData, open]);
    
    const handleSave = () => {
        if (!nombre || !centroId) {
            alert('El nombre y el centro son obligatorios');
            return;
        }
        onSave({ nombre, centroId, esZonaPicking, descripcion });
        onOpenChange(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Editar' : 'Nueva'} Ubicación</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="centro">Centro de Producción</Label>
                        <Select onValueChange={setCentroId} value={centroId}>
                            <SelectTrigger id="centro"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                {centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nombre-ubicacion">Nombre de la Ubicación</Label>
                        <Input id="nombre-ubicacion" value={nombre} onChange={e => setNombre(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="descripcion-ubicacion">Descripción</Label>
                        <Input id="descripcion-ubicacion" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="zona-picking" checked={esZonaPicking} onCheckedChange={checked => setEsZonaPicking(Boolean(checked))} />
                        <Label htmlFor="zona-picking">Es zona de picking rápido</Label>
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

export default function UbicacionesPage() {
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [centros, setCentros] = useState<CentroProduccion[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUbicacion, setEditingUbicacion] = useState<Partial<Ubicacion> | null>(null);
    const [ubicacionToDelete, setUbicacionToDelete] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const centroFilter = searchParams.get('centroId') || 'all';

    const { toast } = useToast();

    useEffect(() => {
        setUbicaciones(JSON.parse(localStorage.getItem('ubicaciones') || '[]'));
        setCentros(JSON.parse(localStorage.getItem('centros') || '[]'));
        setIsMounted(true);
    }, []);

    const filteredItems = useMemo(() => {
        return ubicaciones.filter(item => {
            const searchMatch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const centroMatch = centroFilter === 'all' || item.centroId === centroFilter;
            return searchMatch && centroMatch;
        });
    }, [ubicaciones, searchTerm, centroFilter]);

    const handleSave = (data: Omit<Ubicacion, 'id'>) => {
        let updatedUbicaciones = [...ubicaciones];
        if (editingUbicacion?.id) { // Editing
            const index = ubicaciones.findIndex(u => u.id === editingUbicacion.id);
            if (index > -1) {
                updatedUbicaciones[index] = { ...editingUbicacion, ...data } as Ubicacion;
                toast({ title: 'Ubicación actualizada' });
            }
        } else { // Creating
            const newUbicacion = { ...data, id: `U-${Date.now()}` };
            updatedUbicaciones.push(newUbicacion);
            toast({ title: 'Ubicación creada' });
        }
        
        localStorage.setItem('ubicaciones', JSON.stringify(updatedUbicaciones));
        setUbicaciones(updatedUbicaciones);
    };
    
    const handleDelete = () => {
        if(!ubicacionToDelete) return;
        const updatedUbicaciones = ubicaciones.filter(u => u.id !== ubicacionToDelete);
        localStorage.setItem('ubicaciones', JSON.stringify(updatedUbicaciones));
        setUbicaciones(updatedUbicaciones);
        setUbicacionToDelete(null);
        toast({title: 'Ubicación eliminada'});
    }
    
    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Ubicaciones..." />;
    }

    return (
        <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Input
                    placeholder="Buscar por nombre..."
                    className="flex-grow max-w-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                 <Select value={centroFilter} onValueChange={(value) => router.push(value === 'all' ? '/bd/ubicaciones' : `/bd/ubicaciones?centroId=${value}`)}>
                    <SelectTrigger className="w-full md:w-[240px]">
                        <SelectValue placeholder="Filtrar por centro..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Centros</SelectItem>
                        {centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <div className="flex-grow flex justify-end gap-2">
                    <Button onClick={() => { setEditingUbicacion(null); setIsModalOpen(true); }}><PlusCircle className="mr-2" />Nueva Ubicación</Button>
                </div>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Centro</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-semibold">{item.nombre}</TableCell>
                                <TableCell>{centros.find(c => c.id === item.centroId)?.nombre || 'N/A'}</TableCell>
                                <TableCell>{item.descripcion}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingUbicacion(item); setIsModalOpen(true); }}><Pencil className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setUbicacionToDelete(item.id)}><Trash2 className="h-4 w-4"/></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            <UbicacionModal 
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSave={handleSave}
                centros={centros}
                initialData={editingUbicacion}
            />
            
            <AlertDialog open={!!ubicacionToDelete} onOpenChange={() => setUbicacionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Ubicación?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente la ubicación.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/80">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
