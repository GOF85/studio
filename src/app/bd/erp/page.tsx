
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Save, Trash2, Loader2, Menu, FileUp, FileDown, Database } from 'lucide-react';
import type { ArticuloERP, UnidadMedida, Proveedor } from '@/types';
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
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
    items: z.array(articuloErpSchema)
});

type ArticulosERPFormValues = z.infer<typeof formSchema>;
const CSV_HEADERS = ["id", "idProveedor", "nombreProveedor", "nombreProductoERP", "referenciaProveedor", "familiaCategoria", "precioCompra", "descuento", "unidadConversion", "precioAlquiler", "unidad", "tipo", "alquiler", "observaciones"];

function ArticulosERPPageContent() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [providerFilter, setProviderFilter] useState('all');
  const [forRentFilter, setForRentFilter] = useState(false);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);


  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<ArticulosERPFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        items: []
    }
  });

  const { control, getValues, watch } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  useEffect(() => {
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    const pMap = new Map<string, string>();
    allProveedores.forEach(p => {
        if(p.IdERP) pMap.set(p.IdERP, p.nombreComercial);
    });
    setProveedoresMap(pMap);

    let storedData = localStorage.getItem('articulosERP');
    const items = storedData ? JSON.parse(storedData) : [];
    
    const enrichedItems = items.map((item: ArticuloERP) => ({
      ...item,
      nombreProveedor: pMap.get(item.idProveedor || '') || item.nombreProveedor || ''
    }));

    form.reset({ items: enrichedItems });
    setIsMounted(true);
  }, [form]);
  
  const watchedItems = watch('items');

  const { categories, types, providers } = useMemo(() => {
    if (!watchedItems) return { categories: [], types: [], providers: [] };
    const catSet = new Set<string>();
    const typeSet = new Set<string>();
    const provSet = new Set<string>();
    watchedItems.forEach(item => {
      if (item.familiaCategoria) catSet.add(item.familiaCategoria);
      if (item.tipo) typeSet.add(item.tipo);
      if (item.nombreProveedor) provSet.add(item.nombreProveedor);
    });
    return {
      categories: ['all', ...Array.from(catSet).sort()],
      types: ['all', ...Array.from(typeSet).sort()],
      providers: ['all', ...Array.from(provSet).sort()],
    };
  }, [watchedItems]);

  const filteredItems = useMemo(() => {
    if (!watchedItems) return [];
    return watchedItems.map((item, index) => ({...item, originalIndex: index}))
      .filter(item => {
        const term = searchTerm.toLowerCase();
        const searchMatch =
          (item.nombreProductoERP || '').toLowerCase().includes(term) ||
          (item.nombreProveedor || '').toLowerCase().includes(term) ||
          (item.referenciaProveedor || '').toLowerCase().includes(term) ||
          (item.idProveedor || '').toLowerCase().includes(term) ||
          (item.tipo || '').toLowerCase().includes(term);

        const categoryMatch = categoryFilter === 'all' || item.familiaCategoria === categoryFilter;
        const typeMatch = typeFilter === 'all' || item.tipo === typeFilter;
        const providerMatch = providerFilter === 'all' || item.nombreProveedor === providerFilter;
        const forRentMatch = !forRentFilter || item.alquiler;

        return searchMatch && categoryMatch && typeMatch && providerMatch && forRentMatch;
    });
  }, [watchedItems, searchTerm, categoryFilter, typeFilter, providerFilter, forRentFilter]);

  function onSubmit(data: ArticulosERPFormValues) {
    setIsLoading(true);
    localStorage.setItem('articulosERP', JSON.stringify(data.items));
    setTimeout(() => {
        toast({ title: 'Guardado', description: 'La base de datos de artículos ERP ha sido guardada.' });
        setIsLoading(false);
        form.reset(data); // Mark form as not dirty
    }, 500);
  }

  const handleAddNewRow = () => {
    append({
      id: Date.now().toString(),
      idProveedor: '',
      nombreProductoERP: '',
      referenciaProveedor: '',
      nombreProveedor: '',
      familiaCategoria: '',
      precioCompra: 0,
      descuento: 0,
      unidadConversion: 1,
      precio: 0,
      precioAlquiler: 0,
      unidad: 'UD',
      tipo: '',
      alquiler: false,
      observaciones: '',
    });
  };
  
  const handleDeleteRow = () => {
    if (itemToDelete !== null) {
      remove(itemToDelete);
      setItemToDelete(null);
      toast({title: 'Fila eliminada', description: 'La fila se eliminará permanentemente al guardar los cambios.'})
    }
  }

  const handleExportCSV = () => {
    if (fields.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay artículos para exportar.' });
      return;
    }
    const dataToExport = getValues('items').map(item => {
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
  
  const parseCurrency = (value: string | number) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[€\s]/g, '').replace(',', '.');
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }
    return 0;
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
        
        const importedData: ArticuloERP[] = results.data.map(item => ({
            id: item.id || Date.now().toString() + Math.random(),
            idProveedor: item.idProveedor || '',
            nombreProductoERP: item.nombreProductoERP || '',
            referenciaProveedor: item.referenciaProveedor || '',
            nombreProveedor: proveedoresMap.get(item.idProveedor || '') || item.nombreProveedor || '',
            familiaCategoria: item.familiaCategoria || '',
            precioCompra: parseCurrency(item.precioCompra),
            descuento: parseCurrency(item.descuento),
            unidadConversion: Number(item.unidadConversion) || 1,
            precio: 0, 
            precioAlquiler: parseCurrency(item.precioAlquiler),
            unidad: UNIDADES_MEDIDA.includes(item.unidad) ? item.unidad : 'UD',
            tipo: item.tipo || '',
            alquiler: parseBoolean(item.alquiler),
            observaciones: item.observaciones || ''
        }));
        
        form.reset({items: importedData})
        toast({ title: 'Importación preparada', description: `Se han cargado ${importedData.length} registros. Haz clic en "Guardar Cambios" para confirmar.` });
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
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Database />Base de Datos de Artículos (ERP)</h1>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleAddNewRow}>
                        <PlusCircle className="mr-2" />
                        Añadir Fila
                    </Button>
                     <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Guardar Cambios</span>
                    </Button>
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

                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <Input 
                        placeholder="Buscar..."
                        className="flex-grow max-w-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'Todas las Categorías' : c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'Todos los Tipos' : t}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={providerFilter} onValueChange={setProviderFilter}>
                        <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{providers.map(p => <SelectItem key={p} value={p}>{p === 'all' ? 'Todos los Proveedores' : p}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="for-rent-filter" checked={forRentFilter} onCheckedChange={(checked) => setForRentFilter(Boolean(checked))} />
                        <Label htmlFor="for-rent-filter">Apto Alquiler</Label>
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
                        <TableHead className="p-2 w-48">Producto</TableHead>
                        <TableHead className="p-2 w-28">Id. Proveedor</TableHead>
                        <TableHead className="p-2 w-40">Proveedor</TableHead>
                        <TableHead className="p-2 w-32">Ref. Proveedor</TableHead>
                        <TableHead className="p-2 w-28">P. Compra</TableHead>
                        <TableHead className="p-2 w-28">Desc. %</TableHead>
                        <TableHead className="p-2 w-28">Factor Conv.</TableHead>
                        <TableHead className="p-2 w-28">Precio/Unidad</TableHead>
                        <TableHead className="p-2 w-28">Precio Alquiler</TableHead>
                        <TableHead className="p-2 w-32">Unidad</TableHead>
                        <TableHead className="p-2 w-28 text-center">Apto Alquiler</TableHead>
                        <TableHead className="p-2 w-48">Observaciones</TableHead>
                        <TableHead className="p-2 w-16 text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => {
                            const precioCompra = watchedItems[item.originalIndex]?.precioCompra || 0;
                            const descuento = watchedItems[item.originalIndex]?.descuento || 0;
                            const unidadConversion = watchedItems[item.originalIndex]?.unidadConversion || 1;
                            const precioConDescuento = precioCompra * (1 - (descuento / 100));
                            const precioCalculado = unidadConversion > 0 ? precioConDescuento / unidadConversion : 0;
                            return (
                        <TableRow key={item.id}>
                            <TableCell className="p-1">
                                <FormField control={form.control} name={`items.${item.originalIndex}.nombreProductoERP`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.idProveedor`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <Input value={proveedoresMap.get(item.idProveedor || '') || item.nombreProveedor || ''} readOnly className="h-8 bg-muted/50"/>
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.referenciaProveedor`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.precioCompra`} render={({ field }) => ( <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-8"/> )} />
                            </TableCell>
                             <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.descuento`} render={({ field }) => ( <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.unidadConversion`} render={({ field }) => ( <Input type="number" step="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} className="h-8"/> )} />
                            </TableCell>
                             <TableCell className="p-1">
                                <Input value={formatCurrency(precioCalculado)} readOnly className="h-8 bg-muted/50 font-semibold" />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.precioAlquiler`} render={({ field }) => ( <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                <FormField control={form.control} name={`items.${item.originalIndex}.unidad`} render={({ field }) => ( 
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-8"><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{formatUnit(u)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                            </TableCell>
                            <TableCell className="p-1 text-center">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.alquiler`} render={({ field }) => (
                                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                 )} />
                            </TableCell>
                             <TableCell className="p-1">
                                <FormField control={form.control} name={`items.${item.originalIndex}.observaciones`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="text-right p-1">
                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" type="button" onClick={() => setItemToDelete(item.originalIndex)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                        )})
                    ) : (
                        <TableRow>
                        <TableCell colSpan={13} className="h-24 text-center">
                            No se encontraron artículos que coincidan con la búsqueda.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
            </form>
        </Form>
      </main>

      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La fila se eliminará permanentemente cuando guardes los cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteRow}
            >
              Eliminar Fila
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
                    <AlertDialogDescription>
                        Selecciona el tipo de delimitador que utiliza tu archivo CSV. Normalmente es una coma (,) para archivos de USA/UK o un punto y coma (;) para archivos de Europa.
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
