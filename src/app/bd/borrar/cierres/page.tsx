
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Trash2, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import type { CierreInventario } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function BorrarCierresPage() {
    const [cierres, setCierres] = useState<CierreInventario[]>([]);
    const [selectedCierres, setSelectedCierres] = useState<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const router = useRouter();
    const { toast } = useToast();
    
    const loadCierres = () => {
        const storedCierres = (JSON.parse(localStorage.getItem('cierresInventario') || '[]') as CierreInventario[])
            .sort((a,b) => b.mes.localeCompare(a.mes));
        setCierres(storedCierres);
    };

    useEffect(() => {
        loadCierres();
        setIsMounted(true);
    }, []);

    const handleSelect = (cierreId: string) => {
        setSelectedCierres(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(cierreId)) {
                newSelection.delete(cierreId);
            } else {
                newSelection.add(cierreId);
            }
            return newSelection;
        });
    };

    const handleSelectAll = (checked: boolean | "indeterminate") => {
        if (checked === 'indeterminate') return;
        if (checked) {
            setSelectedCierres(new Set(cierres.map(c => c.id)));
        } else {
            setSelectedCierres(new Set());
        }
    };
    
    const handleDeleteSelected = () => {
        const allCierres = (JSON.parse(localStorage.getItem('cierresInventario') || '[]') as CierreInventario[]);
        const updatedCierres = allCierres.filter(c => !selectedCierres.has(c.id));
        localStorage.setItem('cierresInventario', JSON.stringify(updatedCierres));
        
        toast({
            title: 'Cierres Eliminados',
            description: `Se han eliminado ${selectedCierres.size} registros de cierre.`
        });
        
        setSelectedCierres(new Set());
        loadCierres();
        setShowDeleteConfirm(false);
    };
    
    const numSelected = selectedCierres.size;

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Cierres..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                 <div className="flex items-center justify-between mb-8">
                     <div>
                         <Button variant="ghost" size="sm" onClick={() => router.push('/bd/borrar')} className="mb-2">
                            <ArrowLeft className="mr-2" /> Volver
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                            <Archive className="text-destructive" />
                            Borrar Cierres de Inventario
                        </h1>
                     </div>
                    <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={numSelected === 0}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({numSelected}) Seleccionados
                    </Button>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Cierres</CardTitle>
                        <CardDescription>Selecciona los cierres que deseas eliminar permanentemente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"><Checkbox onCheckedChange={handleSelectAll} checked={numSelected > 0 && numSelected === cierres.length ? true : (numSelected > 0 ? "indeterminate" : false)} /></TableHead>
                                        <TableHead>Mes</TableHead>
                                        <TableHead>Fecha de Cierre</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cierres.length > 0 ? cierres.map(c => (
                                        <TableRow key={c.id} onClick={() => handleSelect(c.id)} className="cursor-pointer">
                                            <TableCell><Checkbox checked={selectedCierres.has(c.id)} /></TableCell>
                                            <TableCell className="font-semibold capitalize">{format(parseISO(`${c.mes}-02`), 'MMMM yyyy', { locale: es })}</TableCell>
                                            <TableCell>{format(new Date(c.fechaCierre), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay cierres de inventario registrados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                </Card>
            </div>
             <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Vas a eliminar permanentemente <strong>{numSelected}</strong> registro(s) de cierre de inventario.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
