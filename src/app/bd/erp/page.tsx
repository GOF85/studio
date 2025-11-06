
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Save, Trash2, Loader2, Menu, FileUp, FileDown, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ArticuloERP, UnidadMedida, Proveedor, FamiliaERP, HistoricoPreciosERP } from '@/types';
import { UNIDADES_MEDIDA, articuloErpSchema } from '@/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { Label } from '@/components/ui/label';
import { differenceInDays, parseISO } from 'date-fns';

const CSV_HEADERS = ["id", "idreferenciaerp", "idProveedor", "nombreProveedor", "nombreProductoERP", "referenciaProveedor", "familiaCategoria", "precioCompra", "descuento", "unidadConversion", "precioAlquiler", "unidad", "tipo", "categoriaMice", "alquiler", "observaciones"];

const ITEMS_PER_PAGE = 20;

function ArticulosERPPageContent() {
  const [items, setItems] = useState<ArticuloERP[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCurrency = (value: string | number) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[€\s]/g, '').replace(',', '.');
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }
    return 0;
  };
  
  const calculatePrice = (item: any): number => {
    const precioCompra = parseCurrency(item.precioCompra);
    const descuento = parseCurrency(item.descuento);
    const unidadConversion = parseCurrency(item.unidadConversion) || 1;
    const precioConDescuento = precioCompra * (1 - (descuento / 100));
    return unidadConversion > 0 ? precioConDescuento / unidadConversion : 0;
  }

  useEffect(() => {
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    const pMap = new Map<string, string>();
    allProveedores.forEach(p => {
        if(p.IdERP) pMap.set(p.IdERP, p.nombreComercial);
    });
    setProveedoresMap(pMap);

    const allFamilias = JSON.parse(localStorage.getItem('familiasERP') || '[]') as FamiliaERP[];
    const familiasMap = new Map(allFamilias.map(f => [f.familiaCategoria, { tipo: f.Familia, categoriaMice: f.Categoria }]));

    let storedData = localStorage.getItem('articulosERP');
    const items = storedData ? JSON.parse(storedData) : [];
    
    const enrichedItems = items.map((item: ArticuloERP) => {
      const familiaInfo = familiasMap.get(item.familiaCategoria || '');
      return {
        ...item,
        precio: calculatePrice(item), // Recalculate price for display
        nombreProveedor: pMap.get(item.idProveedor || '') || item.nombreProveedor || 'Proveedor no identificado',
        tipo: familiaInfo?.tipo || item.tipo,
        categoriaMice: familiaInfo?.categoriaMice || item.categoriaMice,
      };
    });

    setItems(enrichedItems);
    setIsMounted(true);
  }, []);

  const { types, providers } = useMemo(() => {
    if (!items) return { types: [], providers: [] };
    const typeSet = new Set<string>();
    const provSet = new Set<string>();
    items.forEach(item => {
      if (item.tipo) typeSet.add(item.tipo);
      if (item.nombreProveedor) provSet.add(item.nombreProveedor);
    });
    return {
      types: ['all', ...Array.from(typeSet).sort()],
      providers: ['all', ...Array.from(provSet).sort()],
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
        const term = searchTerm.toLowerCase();
        const searchMatch =
          (item.nombreProductoERP || '').toLowerCase().includes(term) ||
          (item.nombreProveedor || '').toLowerCase().includes(term) ||
          (item.referenciaProveedor || '').toLowerCase().includes(term) ||
          (item.idreferenciaerp || '').toLowerCase().includes(term) ||
          (item.tipo || '').toLowerCase().includes(term);

        const typeMatch = typeFilter === 'all' || item.tipo === typeFilter;
        const providerMatch = providerFilter === 'all' || item.nombreProveedor === providerFilter;

        return searchMatch && typeMatch && providerMatch;
    });
  }, [items, searchTerm, typeFilter, providerFilter]);
  
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));


  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay artículos para exportar.' });
      return;
    }
    const dataToExport = items.map(item => {
        const exportItem: any = {};
        CSV_HEADERS.forEach(header => {
            exportItem[header] = (item as any)[header] ?? '';
        });
        return exportItem;
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'articulos_erp.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };
  
  const parseBoolean = (value: any) => {
    const s = String(value).toLowerCase().trim();
    return s === 'true' || s === '1';
  }
  
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
        setIsImportAlertOpen(false);
        return;
    }

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

        if (!hasAllHeaders) {
            toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
            return;
        }
        
        // --- Smart Snapshot Logic ---
        const today = new Date();
        const historicoPrecios: HistoricoPreciosERP[] = JSON.parse(localStorage.getItem('historicoPreciosERP') || '[]') as HistoricoPreciosERP[];
        const currentArticulosMap = new Map(items.map(i => [i.idreferenciaerp, i]));
        
        results.data.forEach((item: any) => {
            const idreferenciaerp = item.idreferenciaerp;
            if (!idreferenciaerp) return;
            
            const existingItem = currentArticulosMap.get(idreferenciaerp);
            const newPrice = calculatePrice(item);
            
            if (existingItem) {
                const oldPrice = calculatePrice(existingItem);
                const lastHistoryEntry = historicoPrecios
                    .filter(h => h.articuloErpId === idreferenciaerp)
                    .sort((a,b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime())[0];
                
                const hasPriceChanged = Math.abs(newPrice - oldPrice) > 0.001;
                const daysSinceLastLog = lastHistoryEntry ? differenceInDays(today, parseISO(lastHistoryEntry.fecha)) : Infinity;
                
                if (hasPriceChanged || daysSinceLastLog > 7) {
                    historicoPrecios.push({
                        id: `${idreferenciaerp}-${today.toISOString()}`,
                        articuloErpId: idreferenciaerp,
                        fecha: today.toISOString(),
                        precioCalculado: newPrice,
                        proveedorId: item.idProveedor,
                    });
                }
            } else {
                // If it's a new item, add it to the history
                historicoPrecios.push({
                    id: `${idreferenciaerp}-${today.toISOString()}`,
                    articuloErpId: idreferenciaerp,
                    fecha: today.toISOString(),
                    precioCalculado: newPrice,
                    proveedorId: item.idProveedor,
                });
            }
        });
        localStorage.setItem('historicoPreciosERP', JSON.stringify(historicoPrecios));
        // --- End Smart Snapshot Logic ---


        const allFamilias = JSON.parse(localStorage.getItem('familiasERP') || '[]') as FamiliaERP[];
        const familiasMap = new Map(allFamilias.map(f => [f.familiaCategoria, { tipo: f.Familia, categoriaMice: f.Categoria }]));
        
        const importedData: ArticuloERP[] = results.data.map((item: any) => {
            const familiaInfo = familiasMap.get(item.familiaCategoria || '');
            const precioCalculado = calculatePrice(item);
            return {
                id: item.id || Date.now().toString() + Math.random(),
                idreferenciaerp: item.idreferenciaerp || '',
                idProveedor: item.idProveedor || '',
                nombreProductoERP: item.nombreProductoERP || '',
                referenciaProveedor: item.referenciaProveedor || '',
                nombreProveedor: proveedoresMap.get(item.idProveedor || '') || item.nombreProveedor || 'Proveedor no identificado',
                familiaCategoria: item.familiaCategoria || '',
                precioCompra: parseCurrency(item.precioCompra),
                descuento: parseCurrency(item.descuento),
                unidadConversion: parseCurrency(item.unidadConversion) || 1,
                precio: precioCalculado,
                precioAlquiler: parseCurrency(item.precioAlquiler),
                unidad: UNIDADES_MEDIDA.includes(item.unidad) ? item.unidad : 'UD',
                tipo: familiaInfo?.tipo || item.tipo || '',
                categoriaMice: familiaInfo?.categoriaMice || item.categoriaMice || '',
                alquiler: parseBoolean(item.alquiler),
                observaciones: item.observaciones || ''
            }
        });
        
        localStorage.setItem('articulosERP', JSON.stringify(importedData));
        setItems(importedData);
        toast({ title: 'Importación completada', description: `Se han cargado ${importedData.length} registros y se ha actualizado el histórico de precios.` });
        setIsImportAlertOpen(false);
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        setIsImportAlertOpen(false);
      }
    });
    if(event.target) {
        event.target.value = '';
    }
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Artículos ERP..." />;
  }

  return (
    <>
       <div className="flex flex-wrap items-center gap-4 mb-4">
          <Input 
              placeholder="Buscar..."
              className="flex-grow max-w-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'Todos los Tipos' : t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{providers.map(p => <SelectItem key={p} value={p}>{p === 'all' ? 'Todos los Proveedores' : p}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex-grow flex justify-end items-center gap-2">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsImportAlertOpen(true); }}>
                        <FileUp size={16} className="mr-2"/>Importar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                        <FileDown size={16} className="mr-2"/>Exportar CSV
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
      

      <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv"
          onChange={(e) => {
          const delimiter = fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';';
          if (delimiter) {
              handleImportCSV(e, delimiter);
          }
          }}
      />

      <div className="border rounded-lg">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="p-2">Producto</TableHead>
                      <TableHead className="p-2">Ref. ERP</TableHead>
                      <TableHead className="p-2">Proveedor</TableHead>
                      <TableHead className="p-2 text-right">P. Compra</TableHead>
                      <TableHead className="p-2 text-right">Desc. %</TableHead>
                      <TableHead className="p-2 text-right">Factor Conv.</TableHead>
                      <TableHead className="p-2 text-right">Precio/Unidad</TableHead>
                      <TableHead className="p-2">Unidad</TableHead>
                      <TableHead className="p-2">Tipo (Familia)</TableHead>
                      <TableHead className="p-2">Categoría MICE</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {paginatedItems.length > 0 ? (
                      paginatedItems.map(item => {
                          const precioCalculado = item.precio || 0;
                          return (
                              <TableRow key={item.id}>
                                  <TableCell className="p-2 text-xs font-medium">{item.nombreProductoERP}</TableCell>
                                  <TableCell className="p-2 text-xs">{item.idreferenciaerp}</TableCell>
                                  <TableCell className="p-2 text-xs">{item.nombreProveedor}</TableCell>
                                  <TableCell className="p-2 text-xs text-right">{formatCurrency(item.precioCompra)}</TableCell>
                                  <TableCell className="p-2 text-xs text-right">{item.descuento}%</TableCell>
                                  <TableCell className="p-2 text-xs text-right">{item.unidadConversion}</TableCell>
                                  <TableCell className="p-2 text-xs text-right font-semibold">{formatCurrency(precioCalculado)}</TableCell>
                                  <TableCell className="p-2 text-xs">{formatUnit(item.unidad)}</TableCell>
                                  <TableCell className="p-2 text-xs">{item.tipo}</TableCell>
                                  <TableCell className="p-2 text-xs">{item.categoriaMice}</TableCell>
                              </TableRow>
                          );
                      })
                  ) : (
                      <TableRow>
                          <TableCell colSpan={10} className="h-24 text-center">No se encontraron artículos que coincidan con la búsqueda.</TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
      </div>

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
                  <AlertDialogDescription>
                      Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="!justify-center gap-4">
                  <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
                  <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ArticulosERPPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Artículos ERP..." />}>
            <ArticulosERPPageContent />
        </Suspense>
    )
}
