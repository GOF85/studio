'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, ChefHat, Link as LinkIcon } from 'lucide-react';
import type { IngredienteInterno, IngredienteERP } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';

type IngredienteConERP = IngredienteInterno & {
    erp?: IngredienteERP;
}

export default function IngredientesPage() {
  const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const router = useRouter();
  
  useEffect(() => {
    // Cargar datos de prueba ERP si no existen
    let storedErp = localStorage.getItem('ingredientesERP');
    if (!storedErp || JSON.parse(storedErp).length === 0) {
      const dummyErp: IngredienteERP[] = [
        { id: 'erp-1', IdERP: 'ERP001', nombreProductoERP: 'Harina de Trigo (Saco 25kg)', referenciaProveedor: 'HT25', nombreProveedor: 'Harinas Molineras', familiaCategoria: 'Secos', precio: 15.00, unidad: 'KILO' },
        { id: 'erp-2', IdERP: 'ERP002', nombreProductoERP: 'Huevo Campero (Caja 30 und)', referenciaProveedor: 'HC30', nombreProveedor: 'Granjas del Sol', familiaCategoria: 'Frescos', precio: 5.50, unidad: 'UNIDAD' },
        { id: 'erp-3', IdERP: 'ERP003', nombreProductoERP: 'Leche Entera (Litro)', referenciaProveedor: 'LE01', nombreProveedor: 'Lácteos El Prado', familiaCategoria: 'Lácteos', precio: 1.10, unidad: 'LITRO' },
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
            { id: 'int-1', nombreIngrediente: 'Harina de Trigo', productoERPlinkId: 'erp-1', mermaPorcentaje: 0, alergenosPresentes: ['GLUTEN'], alergenosTrazas: [] },
            { id: 'int-2', nombreIngrediente: 'Huevo', productoERPlinkId: 'erp-2', mermaPorcentaje: 5, alergenosPresentes: ['HUEVOS'], alergenosTrazas: [] },
            { id: 'int-3', nombreIngrediente: 'Leche', productoERPlinkId: 'erp-3', mermaPorcentaje: 0, alergenosPresentes: ['LACTEOS'], alergenosTrazas: [] },
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id} onClick={() => router.push(`/book/ingredientes/${item.id}`)} className="cursor-pointer">
                    <TableCell className="font-medium">{item.nombreIngrediente}</TableCell>
                    <TableCell>
                      {item.erp ? (
                        <div className="flex flex-col">
                            <span className="flex items-center gap-2 text-sm font-semibold">
                                <LinkIcon className="h-4 w-4 text-green-600" />
                                {item.erp.nombreProductoERP}
                            </span>
                             <span className="text-xs text-muted-foreground pl-6">{item.erp.nombreProveedor}</span>
                        </div>
                      ) : (
                        <span className="text-destructive text-sm font-semibold">No vinculado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.alergenosPresentes?.length > 0 && item.alergenosPresentes.map(alergeno => (
                          <Badge key={alergeno} variant="destructive" className="text-xs">{alergeno}</Badge>
                        ))}
                        {item.alergenosTrazas?.length > 0 && item.alergenosTrazas.map(alergeno => (
                          <Badge key={alergeno} variant="outline" className="text-xs">{alergeno} (traza)</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{item.mermaPorcentaje}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No se encontraron ingredientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
