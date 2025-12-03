'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import type { EspacioFormValues } from '@/lib/validations/espacios';

interface CuadroElectrico {
    ubicacion: string;
    potencia: string;
    notas?: string;
}

export function CuadrosElectricosTab() {
    const form = useFormContext<EspacioFormValues>();
    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: 'cuadrosElectricos',
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [currentCuadro, setCurrentCuadro] = useState<CuadroElectrico>({
        ubicacion: '',
        potencia: '',
        notas: '',
    });

    const openDialog = (index?: number) => {
        if (index !== undefined) {
            setEditingIndex(index);
            const cuadro = fields[index] as any;
            setCurrentCuadro({
                ubicacion: cuadro.ubicacion || '',
                potencia: cuadro.potencia || '',
                notas: cuadro.notas || '',
            });
        } else {
            setEditingIndex(null);
            setCurrentCuadro({
                ubicacion: '',
                potencia: '',
                notas: '',
            });
        }
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingIndex(null);
        setCurrentCuadro({
            ubicacion: '',
            potencia: '',
            notas: '',
        });
    };

    const saveCuadro = () => {
        if (!currentCuadro.ubicacion.trim() || !currentCuadro.potencia.trim()) {
            return;
        }

        if (editingIndex !== null) {
            update(editingIndex, currentCuadro as any);
        } else {
            append(currentCuadro as any);
        }

        closeDialog();
    };

    const deleteCuadro = (index: number) => {
        if (confirm('¿Eliminar este cuadro eléctrico?')) {
            remove(index);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            Cuadros Eléctricos
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Gestiona los cuadros eléctricos disponibles en el espacio
                        </p>
                    </div>
                    <Button type="button" onClick={() => openDialog()} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir Cuadro
                    </Button>
                </CardHeader>
                <CardContent>
                    {fields.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No hay cuadros eléctricos registrados</p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openDialog()}
                                className="mt-3"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Añadir Primer Cuadro
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Potencia</TableHead>
                                    <TableHead>Notas</TableHead>
                                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field: any, index) => (
                                    <TableRow key={field.id || index}>
                                        <TableCell className="font-medium">{field.ubicacion}</TableCell>
                                        <TableCell>{field.potencia}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {field.notas || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openDialog(index)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteCuadro(index)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingIndex !== null ? 'Editar' : 'Añadir'} Cuadro Eléctrico
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Ubicación <span className="text-destructive">*</span>
                            </label>
                            <Input
                                placeholder="Ej: Sala principal, Cocina, Vestíbulo..."
                                value={currentCuadro.ubicacion}
                                onChange={(e) =>
                                    setCurrentCuadro({ ...currentCuadro, ubicacion: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Potencia <span className="text-destructive">*</span>
                            </label>
                            <Input
                                placeholder="Ej: 50kW trifásica, 32A monofásica, 125A"
                                value={currentCuadro.potencia}
                                onChange={(e) =>
                                    setCurrentCuadro({ ...currentCuadro, potencia: e.target.value })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Especifica la potencia disponible y tipo de corriente
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notas</label>
                            <Textarea
                                placeholder="Información adicional sobre el cuadro eléctrico..."
                                value={currentCuadro.notas}
                                onChange={(e) =>
                                    setCurrentCuadro({ ...currentCuadro, notas: e.target.value })
                                }
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeDialog}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={saveCuadro}
                            disabled={!currentCuadro.ubicacion.trim() || !currentCuadro.potencia.trim()}
                        >
                            {editingIndex !== null ? 'Actualizar' : 'Añadir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
