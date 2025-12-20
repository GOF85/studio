'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sprout, Search, AlertTriangle, X } from 'lucide-react';
import type { Alergeno, ElaboracionEnReceta } from '@/types';
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
import { cn } from '@/lib/utils';

export default function AlergenosPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Datos
  const { data: recetas = [], isLoading: isLoadingRecetas } = useRecetas();
  const { data: categorias = [], isLoading: isLoadingCategorias } = useCategoriasRecetas();

  // --- LÓGICA DE INICIALIZACIÓN ---
  // Detectamos si venimos del botón "Intolerantes" (?filter=clean)
  const isCleanFilterActive = (searchParams?.get('filter')) === 'clean';

  // Estados
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
  const [showOnlyClean, setShowOnlyClean] = useState(isCleanFilterActive);

  // Sincronizar URL si cambia externamente
  useEffect(() => {
    setShowOnlyClean((searchParams?.get('filter')) === 'clean');
  }, [searchParams]);

  // Filtrado optimizado
  const filteredRecetas = useMemo(() => {
    return recetas.filter(receta => {
      const matchesCategory = selectedCategory === 'all' || receta.categoria === selectedCategory;
      const matchesSearch = receta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Lógica 1: Si "Solo Limpias" está activo, descarta cualquiera que tenga alérgenos
      if (showOnlyClean && (receta.alergenos && receta.alergenos.length > 0)) {
        return false;
      }

      // Lógica 2: Exclusión específica (Select de alérgenos)
      const hasExcludedAllergen = excludedAllergens.some(excluded => 
        (receta.alergenos || []).includes(excluded as Alergeno)
      );
      
      return matchesCategory && matchesSearch && !hasExcludedAllergen;
    });
  }, [recetas, searchTerm, selectedCategory, excludedAllergens, showOnlyClean]);

  const allergenOptions = ALERGENOS.map(a => ({ 
    value: a, 
    label: a.charAt(0) + a.slice(1).toLowerCase().replace('_', ' ') 
  }));

  // Handlers
  const toggleCleanFilter = () => {
    if (showOnlyClean) {
      router.replace('/book/alergenos');
      setShowOnlyClean(false);
    } else {
      router.replace('/book/alergenos?filter=clean');
      setShowOnlyClean(true);
    }
  };

  if (isLoadingRecetas || isLoadingCategorias) {
    return <LoadingSkeleton title="Cargando índice de alérgenos..." />;
  }

  return (
    <TooltipProvider>
      <main className="pb-24 bg-background min-h-screen">
        
        {/* --- HEADER STICKY (SOLO FILTROS) --- */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm">
          {/* Contenedor alineado con el Breadcrumb (max-w-7xl) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              {/* Buscador */}
              <div className="lg:col-span-3 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar receta..."
                  className="pl-9 h-9 text-sm bg-muted/30 focus-visible:bg-background transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Categoría */}
              <div className="lg:col-span-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 text-sm bg-muted/30 focus:bg-background transition-colors">
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

              {/* MultiSelect Exclusión */}
              <div className="lg:col-span-4">
                <MultiSelect
                  options={allergenOptions}
                  selected={excludedAllergens}
                  onChange={(val) => {
                    setExcludedAllergens(val);
                    if (val.length > 0 && showOnlyClean) setShowOnlyClean(false);
                  }}
                  placeholder="Excluir alérgenos..."
                  searchPlaceholder="Buscar alérgeno..."
                  emptyPlaceholder="No se encontraron alérgenos."
                  className="h-9 text-sm"

                />
              </div>

              {/* Toggle Botón "Solo Limpias" */}
              <div className="lg:col-span-2">
                <Button 
                  variant="outline" 
                  onClick={toggleCleanFilter}
                  className={cn(
                    "w-full h-9 text-xs font-medium border transition-all",
                    showOnlyClean 
                      ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200 hover:border-green-400 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  {showOnlyClean ? (
                    <>
                      <Sprout className="w-3.5 h-3.5 mr-2" />
                      Solo Limpias
                      <X className="w-3 h-3 ml-auto opacity-50" />
                    </>
                  ) : (
                    <>
                      <Sprout className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      Solo Limpias
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          
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
          <div className="hidden md:block border rounded-lg overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[40%] text-xs font-semibold uppercase text-muted-foreground">Nombre Receta</TableHead>
                  <TableHead className="w-[20%] text-xs font-semibold uppercase text-muted-foreground">Categoría</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Alérgenos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecetas.length > 0 ? (
                  filteredRecetas.map(receta => (
                    <TableRow 
                      key={receta.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors group" 
                      onClick={() => router.push(`/book/recetas/${receta.id}`)}
                    >
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {receta.nombre}
                          </span>
                           {/* Tooltip con desglose opcional */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] text-muted-foreground/60 w-fit hover:text-muted-foreground hover:underline cursor-help mt-0.5">
                                Ver desglose
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-3 bg-white border shadow-lg">
                              <h4 className="font-bold text-xs mb-2">Alérgenos por Elaboración:</h4>
                              {receta.elaboraciones && receta.elaboraciones.length > 0 ? (
                                <ul className="space-y-1">
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
                        <Badge variant="secondary" className="font-normal text-[10px] bg-muted/50 text-muted-foreground border-transparent">
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
                            <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200 flex items-center gap-1 w-fit font-medium">
                               <Sprout className="h-3 w-3" /> Libre de alérgenos
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-muted/30 rounded-full">
                            <AlertTriangle className="h-8 w-8 text-amber-500/50" />
                        </div>
                        <div>
                            <p className="font-medium">No se encontraron recetas</p>
                            <p className="text-xs text-muted-foreground mt-1">Prueba a cambiar los filtros seleccionados.</p>
                        </div>
                        {showOnlyClean && (
                            <Button variant="link" onClick={toggleCleanFilter} className="text-green-600 h-auto p-0 text-xs">
                                Desactivar filtro "Solo Limpias"
                            </Button>
                        )}
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
export default function AlergenosPage() {
  return (
    <Suspense fallback={<div>Cargando ...</div>}>
      <AlergenosPageInner />
    </Suspense>
  );
}
