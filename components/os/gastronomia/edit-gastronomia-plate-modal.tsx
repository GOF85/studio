'use client';

import React, { useState, useMemo } from 'react';
import type { GastronomyOrderItem, Receta, Alergeno, CategoriaReceta } from '@/types';
import { ALERGENOS } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface EditGastronomiaPlateModalProps {
  isOpen: boolean;
  plate: GastronomyOrderItem | null;
  categorias: CategoriaReceta[];
  onSave: (updatedPlate: GastronomyOrderItem) => void;
  onClose: () => void;
}

export function EditGastronomiaPlateModal({
  isOpen,
  plate,
  categorias,
  onSave,
  onClose,
}: EditGastronomiaPlateModalProps) {
  const { toast } = useToast();
  const [editForm, setEditForm] = useState({
    nombre: '',
    precio: '',
    categoria: '',
    alergenosPresentes: [] as Alergeno[],
    alergenosTrazas: [] as Alergeno[],
  });

  // Resetear form cuando se abre con plate
  React.useEffect(() => {
    if (isOpen && plate) {
      const recetaData = plate as any;
      
      setEditForm({
        nombre: plate.nombre || '',
        precio: String(plate.precioVenta || ''),
        categoria: recetaData.categoria || '',
        alergenosPresentes: recetaData.alergenosMetadata?.presentes || [],
        alergenosTrazas: recetaData.alergenosMetadata?.trazas || [],
      });
    }
  }, [isOpen, plate]);

  const handleToggleAlergeno = (alergeno: Alergeno, tipo: 'presente' | 'trazas') => {
    setEditForm((prev) => {
      const presentes = [...prev.alergenosPresentes];
      const trazas = [...prev.alergenosTrazas];

      if (tipo === 'presente') {
        const idx = presentes.indexOf(alergeno);
        if (idx >= 0) {
          presentes.splice(idx, 1);
        } else {
          presentes.push(alergeno);
          // Auto-remover del otro array si existe
          const traazasIdx = trazas.indexOf(alergeno);
          if (traazasIdx >= 0) {
            trazas.splice(traazasIdx, 1);
          }
        }
      } else {
        const idx = trazas.indexOf(alergeno);
        if (idx >= 0) {
          trazas.splice(idx, 1);
        } else {
          trazas.push(alergeno);
          // Auto-remover del otro array si existe
          const presentesIdx = presentes.indexOf(alergeno);
          if (presentesIdx >= 0) {
            presentes.splice(presentesIdx, 1);
          }
        }
      }

      return { ...prev, alergenosPresentes: presentes, alergenosTrazas: trazas };
    });
  };

  const handleSave = () => {
    if (!editForm.nombre.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre es requerido' });
      return;
    }

    const precio = parseFloat(editForm.precio);
    if (!editForm.precio || isNaN(precio) || precio <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El precio debe ser un número válido mayor a 0',
      });
      return;
    }

    if (!editForm.categoria.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'La categoría es requerida' });
      return;
    }

    if (!plate) return;

    const updatedPlate: GastronomyOrderItem = {
      ...plate,
      nombre: editForm.nombre.trim(),
      precioVenta: precio,
      costeMateriaPrima: precio,
      costeMateriaPrimaSnapshot: precio,
      precioVentaSnapshot: precio,
      categoria: editForm.categoria,
      alergenos: [...editForm.alergenosPresentes, ...editForm.alergenosTrazas],
      alergenosMetadata: {
        presentes: editForm.alergenosPresentes,
        trazas: editForm.alergenosTrazas,
      },
    };

    onSave(updatedPlate);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-2">
          <DialogTitle>Editar Plato</DialogTitle>
          <DialogDescription className="sr-only">
            Modifica el nombre, precio, categoría y alérgenos del plato manual.
          </DialogDescription>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSave}
            >
              Guardar Cambios
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Nombre - Full Width */}
          <div className="space-y-1">
            <Label htmlFor="edit-nombre" className="text-xs font-semibold">
              Nombre del Plato <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-nombre"
              placeholder="Ej: Brownie artesanal"
              value={editForm.nombre}
              onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              className="text-sm h-8"
            />
          </div>

          {/* Precio y Categoría - Precio 20% / Categoría 80% */}
          <div className="grid gap-3" style={{ gridTemplateColumns: '20% 1fr' }}>
            {/* Precio */}
            <div className="space-y-1">
              <Label htmlFor="edit-precio" className="text-xs font-semibold">
                Precio <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  id="edit-precio"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="8.50"
                  value={editForm.precio}
                  onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                  className="text-sm h-8"
                />
                <span className="text-sm font-semibold text-muted-foreground">€</span>
              </div>
            </div>

            {/* Categoría */}
            <div className="space-y-1">
              <Label htmlFor="edit-categoria" className="text-xs font-semibold">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Select value={editForm.categoria} onValueChange={(val) => setEditForm({ ...editForm, categoria: val })}>
                <SelectTrigger id="edit-categoria" className="h-8 text-sm">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alérgenos - Compacto 2 Columnas */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Alérgenos</Label>
            <div className="border rounded-md p-3 bg-muted/30">
              <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* Columna 1 */}
                <div className="space-y-2">
                  {ALERGENOS.slice(0, Math.ceil(ALERGENOS.length / 2)).map((alergeno) => (
                    <div key={alergeno} className="flex items-center justify-between gap-2 py-0.5">
                      <label className="text-sm font-medium line-clamp-2">{alergeno}</label>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Check Presente */}
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`presente-${alergeno}`}
                            checked={editForm.alergenosPresentes.includes(alergeno)}
                            onCheckedChange={() => handleToggleAlergeno(alergeno, 'presente')}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Presente</span>
                        </div>
                        {/* Check Trazas */}
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`trazas-${alergeno}`}
                            checked={editForm.alergenosTrazas.includes(alergeno)}
                            onCheckedChange={() => handleToggleAlergeno(alergeno, 'trazas')}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-orange-700 dark:text-orange-400 font-semibold">Trazas</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Columna 2 */}
                <div className="space-y-2">
                  {ALERGENOS.slice(Math.ceil(ALERGENOS.length / 2)).map((alergeno) => (
                    <div key={alergeno} className="flex items-center justify-between gap-2 py-0.5">
                      <label className="text-sm font-medium line-clamp-2">{alergeno}</label>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Check Presente */}
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`presente-${alergeno}`}
                            checked={editForm.alergenosPresentes.includes(alergeno)}
                            onCheckedChange={() => handleToggleAlergeno(alergeno, 'presente')}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Presente</span>
                        </div>
                        {/* Check Trazas */}
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`trazas-${alergeno}`}
                            checked={editForm.alergenosTrazas.includes(alergeno)}
                            onCheckedChange={() => handleToggleAlergeno(alergeno, 'trazas')}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-orange-700 dark:text-orange-400 font-semibold">Trazas</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
