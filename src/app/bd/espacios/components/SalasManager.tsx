'use client';

import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react';
import { Sala } from '@/types/espacios';

export function SalasManager() {
    const { control, register } = useFormContext();
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "salas"
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [currentSala, setCurrentSala] = useState<Partial<Sala>>({});

    const handleOpenModal = (index?: number) => {
        if (index !== undefined) {
            setEditingIndex(index);
            setCurrentSala(fields[index] as unknown as Sala);
        } else {
            setEditingIndex(null);
            setCurrentSala({
                nombreSala: '',
                m2: 0,
                aforoTeatro: 0,
                aforoEscuela: 0,
                aforoCabaret: 0,
                aforoBanquete: 0,
                aforoCocktailSala: 0,
                esDiafana: false,
                tieneLuzNatural: false,
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveSala = () => {
        if (!currentSala.nombreSala) return;

        if (editingIndex !== null) {
            update(editingIndex, currentSala);
        } else {
            append(currentSala);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Salas y Espacios</h3>
                <Button type="button" onClick={() => handleOpenModal()} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Sala
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>M2</TableHead>
                            <TableHead>Cocktail</TableHead>
                            <TableHead>Banquete</TableHead>
                            <TableHead>Características</TableHead>
                            <TableHead className="w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No hay salas registradas. Añade la primera sala.
                                </TableCell>
                            </TableRow>
                        ) : (
                            fields.map((field, index) => {
                                const sala = field as unknown as Sala;
                                return (
                                    <TableRow key={field.id}>
                                        <TableCell className="font-medium">{sala.nombreSala}</TableCell>
                                        <TableCell>{sala.m2 || '-'}</TableCell>
                                        <TableCell>{sala.aforoCocktailSala || '-'}</TableCell>
                                        <TableCell>{sala.aforoBanquete || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {sala.esDiafana && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Diáfana</span>}
                                                {sala.tieneLuzNatural && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Luz Nat.</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenModal(index)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? 'Editar Sala' : 'Nueva Sala'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-sm font-medium mb-1 block">Nombre de la Sala *</label>
                                <Input
                                    value={currentSala.nombreSala || ''}
                                    onChange={(e) => setCurrentSala({ ...currentSala, nombreSala: e.target.value })}
                                    placeholder="Ej: Salón Principal"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Superficie (m2)</label>
                                <Input
                                    type="number"
                                    value={currentSala.m2 || ''}
                                    onChange={(e) => setCurrentSala({ ...currentSala, m2: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Dimensiones (LxA)</label>
                                <Input
                                    value={currentSala.dimensiones || ''}
                                    onChange={(e) => setCurrentSala({ ...currentSala, dimensiones: e.target.value })}
                                    placeholder="Ej: 20x15m"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Altura Máx (m)</label>
                                <Input
                                    type="number"
                                    value={currentSala.alturaMax || ''}
                                    onChange={(e) => setCurrentSala({ ...currentSala, alturaMax: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Altura Mín (m)</label>
                                <Input
                                    type="number"
                                    value={currentSala.alturaMin || ''}
                                    onChange={(e) => setCurrentSala({ ...currentSala, alturaMin: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <h4 className="text-sm font-semibold mb-3">Aforos</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs mb-1 block">Cocktail</label>
                                    <Input
                                        type="number"
                                        value={currentSala.aforoCocktailSala || ''}
                                        onChange={(e) => setCurrentSala({ ...currentSala, aforoCocktailSala: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs mb-1 block">Banquete</label>
                                    <Input
                                        type="number"
                                        value={currentSala.aforoBanquete || ''}
                                        onChange={(e) => setCurrentSala({ ...currentSala, aforoBanquete: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs mb-1 block">Cabaret</label>
                                    <Input
                                        type="number"
                                        value={currentSala.aforoCabaret || ''}
                                        onChange={(e) => setCurrentSala({ ...currentSala, aforoCabaret: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs mb-1 block">Teatro</label>
                                    <Input
                                        type="number"
                                        value={currentSala.aforoTeatro || ''}
                                        onChange={(e) => setCurrentSala({ ...currentSala, aforoTeatro: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs mb-1 block">Escuela</label>
                                    <Input
                                        type="number"
                                        value={currentSala.aforoEscuela || ''}
                                        onChange={(e) => setCurrentSala({ ...currentSala, aforoEscuela: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="esDiafana"
                                    checked={currentSala.esDiafana || false}
                                    onCheckedChange={(checked) => setCurrentSala({ ...currentSala, esDiafana: checked as boolean })}
                                />
                                <label htmlFor="esDiafana" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Es Diáfana (sin columnas)
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="tieneLuzNatural"
                                    checked={currentSala.tieneLuzNatural || false}
                                    onCheckedChange={(checked) => setCurrentSala({ ...currentSala, tieneLuzNatural: checked as boolean })}
                                />
                                <label htmlFor="tieneLuzNatural" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Tiene Luz Natural
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSala}>Guardar Sala</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
