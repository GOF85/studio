

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sprout } from 'lucide-react';
import type { Receta, ElaboracionEnReceta, Alergeno, CategoriaReceta } from '@/types';
import { ALERGENOS } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MultiSelect } from '@/components/ui/multi-select';
import { AllergenBadge } from '@/components/icons/allergen-badge';

export default function AlergenosPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [categorias, setCategorias] = useState<CategoriaReceta[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
  
  const router = useRouter();

  useEffect(() => {
    const storedRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    setRecetas(storedRecetas);
    const storedCategories = JSON.parse(localStorage.getItem('categoriasRecetas') || '[]') as CategoriaReceta[];
    setCategorias(storedCategories);
    setIsMounted(true);
  }, []);
  
  const filteredRecetas = useMemo(() => {
    return recetas.filter(receta => {
        const matchesCategory = selectedCategory === 'all' || receta.categoria === selectedCategory;
        const matchesSearch = receta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const hasExcludedAllergen = excludedAllergens.some(excluded => (receta.alergenos || []).includes(excluded as Alergeno));
        return matchesCategory && matchesSearch && !hasExcludedAllergen;
    });
  }, [recetas, searchTerm, selectedCategory, excludedAllergens]);

  const allergenOptions = ALERGENOS.map(a => ({ value: a, label: a.charAt(0) + a.slice(1).toLowerCase().replace('_', ' ') }));

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Información de Alérgenos..." />;
  }

  return (
    <TooltipProvider>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Input 
              placeholder="Buscar por nombre de receta..."
              className="max-w-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {categorias.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <MultiSelect
              options={allergenOptions}
              selected={excludedAllergens}
              onChange={setExcludedAllergens}
              placeholder="Excluir alérgenos..."
              searchPlaceholder="Buscar alérgeno a excluir..."
              emptyPlaceholder="No se encontraron alérgenos."
              className="w-[300px]"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Receta</TableHead>
                <TableHead>Alérgenos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecetas.length > 0 ? (
                filteredRecetas.map(receta => (
                  <TableRow key={receta.id} className="cursor-pointer" onClick={() => router.push(`/book/recetas/${receta.id}`)}>
                    <TableCell className="font-medium">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="hover:text-primary">{receta.nombre}</span>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <div className="p-2 max-w-sm">
                                    <h4 className="font-bold mb-2">Desglose de Alérgenos por Elaboración</h4>
                                    {receta.elaboraciones.length > 0 ? (
                                        <ul className="space-y-1">
                                        {receta.elaboraciones.map(elab => (
                                            <li key={elab.id} className="text-xs">
                                                <span className="font-semibold">{elab.nombre}:</span>
                                                <span className="text-muted-foreground ml-2">
                                                    {(elab.alergenos && elab.alergenos.length > 0) ? elab.alergenos.join(', ') : 'Ninguno'}
                                                </span>
                                            </li>
                                        ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Esta receta no tiene elaboraciones.</p>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {(receta.alergenos || []).map(alergeno => (
                            <AllergenBadge key={alergeno} allergen={alergeno} />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No se encontraron recetas con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </TooltipProvider>
  );
}
