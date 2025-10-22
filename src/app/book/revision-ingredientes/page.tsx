

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, CheckCircle, Pencil, Search } from 'lucide-react';
import type { IngredienteInterno, ArticuloERP, Alergeno } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AllergenBadge } from '@/components/icons/allergen-badge';

type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export default function RevisionIngredientesPage() {
  const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedErp = localStorage.getItem('articulosERP') || '[]';
    const articulosERP = JSON.parse(storedErp) as ArticuloERP[];
    const erpMap = new Map(articulosERP.map(item => [item.id, item]));

    let storedIngredientes = localStorage.getItem('ingredientesInternos') || '[]';
    const ingredientesInternos = JSON.parse(storedIngredientes) as IngredienteInterno[];
    
    const combinedData: IngredienteConERP[] = ingredientesInternos.map(ing => ({
        ...ing,
        erp: erpMap.get(ing.productoERPlinkId),
    }));

    // Sort by lastRevision date, oldest first. Nulls/undefined at the top.
    combinedData.sort((a, b) => {
        if (!a.lastRevision) return -1;
        if (!b.lastRevision) return 1;
        return new Date(a.lastRevision).getTime() - new Date(b.lastRevision).getTime();
    });

    setIngredientes(combinedData);
    setIsMounted(true);
  }, [updateTrigger]);

  const handleMarkAsRevised = (ingredienteId: string) => {
    let allItems = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const index = allItems.findIndex(i => i.id === ingredienteId);
    if (index > -1) {
        allItems[index].lastRevision = new Date().toISOString();
        localStorage.setItem('ingredientesInternos', JSON.stringify(allItems));
        toast({ title: "Ingrediente Revisado", description: "La fecha de revisión ha sido actualizada." });
        setUpdateTrigger(Date.now()); // Force re-render and re-sort
    }
  }

  const filteredItems = useMemo(() => {
    return ingredientes.filter(item => 
      item.nombreIngrediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.erp?.nombreProductoERP || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.erp?.nombreProveedor || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ingredientes, searchTerm]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Revisión de Ingredientes..." />;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por ingrediente, producto ERP o proveedor..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[15%]">Ingrediente</TableHead>
                <TableHead className="w-[25%]">Vínculo ERP</TableHead>
                <TableHead>Alérgenos</TableHead>
                <TableHead className="w-[15%]">Última Revisión</TableHead>
                <TableHead className="text-right w-36">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const daysSinceRevision = item.lastRevision ? differenceInDays(new Date(), new Date(item.lastRevision)) : null;
                  const needsRevision = daysSinceRevision === null || daysSinceRevision > 180; // 6 months

                  return (
                  <TableRow key={item.id} className={cn(needsRevision && "bg-amber-50")}>
                    <TableCell className="font-medium">{item.nombreIngrediente}</TableCell>
                    <TableCell>
                      {item.erp ? (
                        <div>
                          <p className="font-semibold">{item.erp.nombreProductoERP}</p>
                          <p className="text-xs text-muted-foreground">{item.erp.nombreProveedor} - {item.erp.precio.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}/{item.erp.unidad}</p>
                        </div>
                      ) : (
                        <Badge variant="destructive">Sin Vínculo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(item.alergenosPresentes || []).map(a => <AllergenBadge key={a} allergen={a as Alergeno} />)}
                        {(item.alergenosTrazas || []).map(a => <AllergenBadge key={a} allergen={a as Alergeno} isTraza />)}
                      </div>
                    </TableCell>
                    <TableCell>
                        <Tooltip>
                            <TooltipTrigger>
                                {daysSinceRevision !== null ? `${daysSinceRevision} días` : 'Nunca'}
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{item.lastRevision ? format(new Date(item.lastRevision), 'dd/MM/yyyy HH:mm', { locale: es }) : 'Sin fecha de revisión'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleMarkAsRevised(item.id)}>
                                    <CheckCircle className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Marcar como revisado</p></TooltipContent>
                        </Tooltip>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/book/ingredientes/${item.id}`)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Editar</p></TooltipContent>
                        </Tooltip>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron ingredientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </TooltipProvider>
  );
}
