'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, ChefHat, Link as LinkIcon } from 'lucide-react';
import type { IngredienteInterno, IngredienteERP, Alergeno } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type IngredienteConERP = IngredienteInterno & {
    erp?: IngredienteERP;
}

export default function IngredientesPage() {
  const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    // Cargar datos de prueba ERP si no existen
    let storedErp = localStorage.getItem('ingredientesERP');
    if (!storedErp || JSON.parse(storedErp).length === 0) {
      const dummyErp: IngredienteERP[] = [
        { id: 'erp-1', nombreProductoERP: 'Harina de Trigo (Saco 25kg)', referenciaProveedor: 'HT25', nombreProveedor: 'Harinas Molineras', familiaCategoria: 'Secos', precio: 15.00, unidad: 'KILO' },
        { id: 'erp-2', nombreProductoERP: 'Huevo Campero (Caja 30 und)', referenciaProveedor: 'HC30', nombreProveedor: 'Granjas del Sol', familiaCategoria: 'Frescos', precio: 5.50, unidad: 'UNIDAD' },
        { id: 'erp-3', nombreProductoERP: 'Leche Entera (Litro)', referenciaProveedor: 'LE01', nombreProveedor: 'Lácteos El Prado', familiaCategoria: 'Lácteos', precio: 1.10, unidad: 'LITRO' },
      ];
      storedErp = JSON.stringify(dummyErp);
      localStorage.setItem('ingredientesERP', storedErp);
    }
    const ingredientesERP = JSON.parse(storedErp) as IngredienteERP[];
    const erpMap = new Map(ingredientesERP.map(item => [item.id, item]));

    // Cargar datos de prueba de Ingredientes Internos si no existen
    let storedIngredientes = localStorage.getItem('ingredientesInternos');
    if (!storedIngredientes || JSON.parse(storedIngredientes).length === 0) {
        const dummyInternos: IngredienteInterno[] = [
            { id: 'int-1', nombreIngrediente: 'Harina de Trigo', productoERPlinkId: 'erp-1', mermaPorcentaje: 0, alergenos: ['GLUTEN'] },
            { id: 'int-2', nombreIngrediente: 'Huevo', productoERPlinkId: 'erp-2', mermaPorcentaje: 5, alergenos: ['HUEVOS'] },
            { id: 'int-3', nombreIngrediente: 'Leche', productoERPlinkId: 'erp-3', mermaPorcentaje: 0, alergenos: ['LACTEOS'] },
        ];
        storedIngredientes = JSON.stringify(dummyInternos);
        localStorage.setItem('ingredientesInternos', storedIngredientes);
    }
    const ingredientesInternos = JSON.parse(storedIngredientes) as IngredienteInterno[];
    
    const combinedData = ingredientesInternos.map(ing => ({
        ...ing,
        erp: erpMap.get(ing.productoERPlinkId),
    }));

    setIngredientes(combinedData);
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return ingredientes.filter(item => 
      item.nombreIngrediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.erp?.nombreProductoERP.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ingredientes, searchTerm]);

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = ingredientes.filter(i => i.id !== itemToDelete);
    const updatedInternos = updatedData.map(({ erp, ...rest }) => rest);
    localStorage.setItem('ingredientesInternos', JSON.stringify(updatedInternos));
    setIngredientes(updatedData);
    toast({ title: 'Ingrediente eliminado' });
    setItemToDelete(null);
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Ingredientes..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><ChefHat />Gestión de Ingredientes</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/book/ingredientes/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Ingrediente
              </Link>
            </Button>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Importar y Exportar</h2>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <Button variant="outline" className="w-full md:w-auto" disabled>
              <FileUp className="mr-2" />
              Importar CSV (Próximamente)
            </Button>
            <Button variant="outline" className="w-full md:w-auto" disabled>
              <FileDown className="mr-2" />
              Exportar CSV (Próximamente)
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por ingrediente interno o producto ERP..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente Interno</TableHead>
                <TableHead>Producto ERP Vinculado</TableHead>
                <TableHead>Alérgenos</TableHead>
                <TableHead>% Merma</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombreIngrediente}</TableCell>
                    <TableCell>
                      {item.erp ? (
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <LinkIcon className="h-4 w-4 text-green-600" />
                          {item.erp.nombreProductoERP}
                        </span>
                      ) : (
                        <span className="text-destructive text-sm font-semibold">No vinculado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.alergenos?.length > 0 ? item.alergenos.map(alergeno => (
                          <Badge key={alergeno} variant="secondary" className="text-xs">{alergeno}</Badge>
                        )) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>{item.mermaPorcentaje}%</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/book/ingredientes/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(item.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
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
      </main>

       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el ingrediente y puede afectar a elaboraciones y recetas que lo utilicen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
