'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, ChefHat, Link as LinkIcon, Menu, FileUp, FileDown } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';

type IngredienteConERP = IngredienteInterno & {
    erp?: IngredienteERP;
    alergenos: Alergeno[];
}

const CSV_HEADERS = ["id", "nombreIngrediente", "productoERPlinkId", "mermaPorcentaje", "alergenosPresentes", "alergenosTrazas"];

export default function IngredientesPage() {
  const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
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
    
    const combinedData = ingredientesInternos.map(ing => {
        const presentes = ing.alergenosPresentes || [];
        const trazas = ing.alergenosTrazas || [];
        return {
            ...ing,
            erp: erpMap.get(ing.productoERPlinkId),
            alergenos: [...new Set([...presentes, ...trazas])] as Alergeno[],
        }
    });

    setIngredientes(combinedData);
    setIsMounted(true);
  }, []);
  
  const handleExportCSV = () => {
    if (ingredientes.length === 0) {
        toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay ingredientes para exportar.' });
        return;
    }
    
    const dataToExport = ingredientes.map(item => {
        const { erp, alergenos, ...rest } = item;
        return {
            ...rest,
            alergenosPresentes: JSON.stringify(item.alergenosPresentes),
            alergenosTrazas: JSON.stringify(item.alergenosTrazas),
        };
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ingredientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo ingredientes.csv se ha descargado.' });
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<any>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const headers = results.meta.fields || [];
            const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

            if (!hasAllHeaders) {
                toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
                return;
            }
            
            const importedData: IngredienteInterno[] = results.data.map(item => {
                let alergenosPresentes = [];
                let alergenosTrazas = [];
                try {
                    alergenosPresentes = JSON.parse(item.alergenosPresentes || '[]');
                    alergenosTrazas = JSON.parse(item.alergenosTrazas || '[]');
                } catch(e) { console.error("Error parsing JSON fields for item:", item.id); }

                return {
                    id: item.id || Date.now().toString() + Math.random(),
                    nombreIngrediente: item.nombreIngrediente || '',
                    productoERPlinkId: item.productoERPlinkId || '',
                    mermaPorcentaje: parseFloat(item.mermaPorcentaje) || 0,
                    alergenosPresentes,
                    alergenosTrazas,
                };
            });
            
            localStorage.setItem('ingredientesInternos', JSON.stringify(importedData));
            // Reload data after import
             window.location.reload();
            toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros. La página se recargará.` });
        },
        error: (error) => {
            toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        }
    });
    if(event.target) {
        event.target.value = '';
    }
  };

  const filteredItems = useMemo(() => {
    return ingredientes.filter(item => {
      const term = searchTerm.toLowerCase();
      return (
        item.nombreIngrediente.toLowerCase().includes(term) ||
        (item.erp?.nombreProductoERP || '').toLowerCase().includes(term) ||
        (item.erp?.IdERP || '').toLowerCase().includes(term) ||
        (item.erp?.familiaCategoria || '').toLowerCase().includes(term)
      );
    });
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                      <Menu />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleImportClick}>
                       <FileUp size={16} className="mr-2"/>Importar CSV
                       <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv"
                        onChange={handleImportCSV}
                      />
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={handleExportCSV}>
                       <FileDown size={16} className="mr-2"/>Exportar CSV
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por ingrediente, producto ERP, Id. ERP o categoría..."
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
                <TableHead>Id. ERP</TableHead>
                <TableHead>Categoría ERP</TableHead>
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
                     <TableCell>{item.erp?.IdERP}</TableCell>
                     <TableCell>{item.erp?.familiaCategoria}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.alergenos?.length > 0 && item.alergenos.map(alergeno => {
                           const isPresente = (item.alergenosPresentes || []).includes(alergeno);
                           const isTraza = (item.alergenosTrazas || []).includes(alergeno);
                           if (isPresente) return <Badge key={alergeno} variant="destructive" className="text-xs">{alergeno}</Badge>
                           if (isTraza) return <Badge key={alergeno} variant="outline" className="text-xs">{alergeno} (T)</Badge>
                           return null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>{item.mermaPorcentaje}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
