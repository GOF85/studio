'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sprout, ChevronLeft, Search, ShieldCheck, AlertTriangle } from 'lucide-react';
// FIX: Añadido ElaboracionEnReceta a los imports
import type { Receta, Alergeno, ElaboracionEnReceta } from '@/types';
import { ALERGENOS } from '@/types';
import { useRecetas, useCategoriasRecetas } from '@/hooks/use-data-queries';

// UI Components
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MultiSelect } from '@/components/ui/multi-select';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AlergenosPage() {
  const { data: recetas = [], isLoading: isLoadingRecetas } = useRecetas();
  const { data: categorias = [], isLoading: isLoadingCategorias } = useCategoriasRecetas();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);

  const router = useRouter();

  // Filtrado optimizado
  const filteredRecetas = useMemo(() => {
    return recetas.filter(receta => {
      const matchesCategory = selectedCategory === 'all' || receta.categoria === selectedCategory;
      const matchesSearch = receta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Lógica de exclusión: Si selecciono "Gluten", quiero ver recetas QUE NO TENGAN Gluten.
      const hasExcludedAllergen = excludedAllergens.some(excluded => 
        (receta.alergenos || []).includes(excluded as Alergeno)
      );
      
      return matchesCategory && matchesSearch && !hasExcludedAllergen;
    });
  }, [recetas, searchTerm, selectedCategory, excludedAllergens]);

  const allergenOptions = ALERGENOS.map(a => ({ 
    value: a, 
    label: a.charAt(0) + a.slice(1).toLowerCase().replace('_', ' ') 
  }));

  if (isLoadingRecetas || isLoadingCategorias) {
    return <LoadingSkeleton title="Cargando índice de alérgenos..." />;
  }

  return (
    <TooltipProvider>
      <main className="pb-24 bg-background min-h-screen">
        
        {/* --- HEADER STICKY CON FILTROS --- */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm">
          <div className="flex flex-col gap-4 px-4 py-3 max-w-7xl mx-auto">
            
            {/* Fila 1: Título y Navegación */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.push('/book')} className="-ml-2 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Índice de Alérgenos
              </h1>
              <div className="ml-auto text-xs text-muted-foreground font-mono">
                {filteredRecetas.length} recetas
              </div>
            </div>

            {/* Fila 2: Filtros (Grid Responsive) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Buscador */}
              <div className="lg:col-span-4 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar receta..."
                  className="pl-9 h-9 text-sm bg-muted/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Categoría */}
              <div className="lg:col-span-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 text-sm bg-muted/30">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Categorías</SelectItem>
                    {categorias.map((c: any) => (
                      <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* MultiSelect Exclusión (El más importante aquí) */}
              <div className="lg:col-span-5">
                <MultiSelect
                  options={allergenOptions}
                  selected={excludedAllergens}
                  onChange={setExcludedAllergens}
                  placeholder="Excluir alérgenos (Filtro de seguridad)..."
                  searchPlaceholder="Buscar alérgeno..."
                  emptyPlaceholder="No se encontraron alérgenos."
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <div className="p-4 max-w-7xl mx-auto space-y-4">
          
          {/* MÓVIL: VISTA DE TARJETAS */}
          <div className="md:hidden space-y-3">
            {filteredRecetas.length > 0 ? (
              filteredRecetas.map(receta => (
                <Card 
                  key={receta.id} 
                  onClick={() => router.push(`/book/recetas/${receta.id}`)}
                  className="shadow-none border border-border/60 active:scale-[0.99] transition-transform cursor-pointer"
                >
                  <CardHeader className="p-3 pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground leading-tight">
                          {receta.nombre}
                        </CardTitle>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium mt-1 block">
                          {receta.categoria}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <Separator className="my-2" />
                    <div className="flex flex-wrap gap-1.5">
                      {(receta.alergenos && receta.alergenos.length > 0) ? (
                        receta.alergenos.map((alergeno: Alergeno) => (
                          <AllergenBadge key={alergeno} allergen={alergeno} />
                        ))
                      ) : (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <Sprout className="h-3 w-3" /> Libre de alérgenos declarados
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay recetas que cumplan los criterios de seguridad seleccionados.
              </div>
            )}
          </div>

          {/* DESKTOP: VISTA DE TABLA */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[40%]">Nombre Receta</TableHead>
                  <TableHead className="w-[20%]">Categoría</TableHead>
                  <TableHead>Alérgenos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecetas.length > 0 ? (
                  filteredRecetas.map(receta => (
                    <TableRow 
                      key={receta.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={() => router.push(`/book/recetas/${receta.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{receta.nombre}</span>
                           {/* Tooltip con desglose opcional */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground w-fit hover:underline cursor-help">
                                Ver desglose
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-3">
                              <h4 className="font-bold text-xs mb-2">Alérgenos por Elaboración:</h4>
                              {receta.elaboraciones && receta.elaboraciones.length > 0 ? (
                                <ul className="space-y-1">
                                  {/* FIX: Tipado explícito de 'elab' para evitar error 7006 */}
                                  {receta.elaboraciones.map((elab: ElaboracionEnReceta) => (
                                    <li key={elab.id} className="text-xs flex justify-between gap-4">
                                      <span>{elab.nombre}:</span>
                                      <span className="text-muted-foreground">
                                        {(elab.alergenos && elab.alergenos.length > 0) ? elab.alergenos.join(', ') : '-'}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : <span className="text-xs text-muted-foreground">Sin elaboraciones</span>}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal text-xs">
                          {receta.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(receta.alergenos && receta.alergenos.length > 0) ? (
                            receta.alergenos.map((alergeno: Alergeno) => (
                              <AllergenBadge key={alergeno} allergen={alergeno} />
                            ))
                          ) : (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1 w-fit">
                               <Sprout className="h-3 w-3" /> Libre de alérgenos
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-amber-400 opacity-50" />
                        <p>No se encontraron recetas con los filtros seleccionados.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

        </div>
      </main>
    </TooltipProvider>
  );
}