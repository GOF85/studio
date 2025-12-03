'use client';

import { useFormContext } from 'react-hook-form';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { EspacioFormValues } from '@/lib/validations/espacios';
import type { ContactoEspacio } from '@/types/espacios';

export function ContactosTab() {
    const form = useFormContext<EspacioFormValues>();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [currentContacto, setCurrentContacto] = useState<Partial<ContactoEspacio>>({
        nombre: '',
        cargo: '',
        telefono: '',
        email: '',
        esPrincipal: false,
        notas: '',
    });

    const contactos = form.watch('contactos') || [];

    const openDialog = (index?: number) => {
        if (index !== undefined) {
            setEditingIndex(index);
            setCurrentContacto({ ...contactos[index] });
        } else {
            setEditingIndex(null);
            setCurrentContacto({
                nombre: '',
                cargo: '',
                telefono: '',
                email: '',
                esPrincipal: false,
                notas: '',
            });
        }
        setIsDialogOpen(true);
    };

    const saveContacto = () => {
        if (!currentContacto.nombre?.trim()) {
            return;
        }

        const updated = [...contactos];

        // Si se marca como principal, desmarcar otros
        if (currentContacto.esPrincipal) {
            updated.forEach(c => c.esPrincipal = false);
        }

        if (editingIndex !== null) {
            updated[editingIndex] = currentContacto as any;
        } else {
            updated.push(currentContacto as any);
        }

        form.setValue('contactos', updated);
        setIsDialogOpen(false);
    };

    const deleteContacto = (index: number) => {
        const updated = contactos.filter((_, i) => i !== index);
        form.setValue('contactos', updated);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Contactos del Espacio</CardTitle>
                    <Button type="button" onClick={() => openDialog()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir Contacto
                    </Button>
                </CardHeader>
                <CardContent>
                    {contactos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay contactos añadidos. Haz clic en "Añadir Contacto" para empezar.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-center">Principal</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contactos.map((contacto, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{contacto.nombre}</TableCell>
                                        <TableCell>{contacto.cargo || '-'}</TableCell>
                                        <TableCell>{contacto.telefono || '-'}</TableCell>
                                        <TableCell>{contacto.email || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            {contacto.esPrincipal && (
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mx-auto" />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDialog(index)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => deleteContacto(index)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingIndex !== null ? 'Editar Contacto' : 'Nuevo Contacto'}
                        </DialogTitle>
                        <DialogDescription>
                            Introduce los datos del contacto del espacio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="nombre">Nombre *</Label>
                            <Input
                                id="nombre"
                                value={currentContacto.nombre || ''}
                                onChange={(e) => setCurrentContacto({ ...currentContacto, nombre: e.target.value })}
                                placeholder="Nombre completo"
                            />
                        </div>
                        <div>
                            <Label htmlFor="cargo">Cargo</Label>
                            <Input
                                id="cargo"
                                value={currentContacto.cargo || ''}
                                onChange={(e) => setCurrentContacto({ ...currentContacto, cargo: e.target.value })}
                                placeholder="Ej: Director Comercial"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="telefono">Teléfono</Label>
                                <Input
                                    id="telefono"
                                    type="tel"
                                    value={currentContacto.telefono || ''}
                                    onChange={(e) => setCurrentContacto({ ...currentContacto, telefono: e.target.value })}
                                    placeholder="600 123 456"
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={currentContacto.email || ''}
                                    onChange={(e) => setCurrentContacto({ ...currentContacto, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="notas">Notas</Label>
                            <Textarea
                                id="notas"
                                value={currentContacto.notas || ''}
                                onChange={(e) => setCurrentContacto({ ...currentContacto, notas: e.target.value })}
                                placeholder="Información adicional..."
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="principal"
                                checked={currentContacto.esPrincipal || false}
                                onCheckedChange={(checked) =>
                                    setCurrentContacto({ ...currentContacto, esPrincipal: checked as boolean })
                                }
                            />
                            <Label htmlFor="principal" className="cursor-pointer">
                                Marcar como contacto principal
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={saveContacto}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
