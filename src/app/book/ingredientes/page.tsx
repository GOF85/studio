
'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, ChefHat, Link as LinkIcon, Menu, FileUp, FileDown, ChevronLeft, ChevronRight, Trash2, AlertTriangle, MoreHorizontal, Pencil, Check, CircleX } from 'lucide-react';
import type { IngredienteInterno, ArticuloERP, Alergeno, Elaboracion, Receta } from '@/types';
import { ALERGENOS } from '@/types';

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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import * as React from 'react';

const ingredienteFormSchema = z.object({
  id: z.string(),
  nombreIngrediente: z.string().min(1, 'El nombre es obligatorio'),
  productoERPlinkId: z.string().min(1, 'Debe enlazar un producto ERP'),
  alergenosPresentes: z.array(z.string()).default([]),
  alergenosTrazas: z.array(z.string()).default([]),
  lastRevision: z.string().optional(),
});

type IngredienteFormValues = z.infer<typeof ingredienteFormSchema>;

type IngredienteConERP = IngredienteInterno & {
    erp?: ArticuloERP;
    alergenos: Alergeno[];
};

const CSV_HEADERS = ["id", "nombreIngrediente", "productoERPlinkId", "alergenosPresentes", "alergenosTrazas", "lastRevision"];
const ITEMS_PER_PAGE = 20;


function IngredienteFormModal({ open, onOpenChange, initialData, onSave }: { open: boolean, onOpenChange: (open: boolean) => void, initialData: Partial<IngredienteInterno> | null, onSave: (data: IngredienteFormValues) => void }) {
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [erpSearchTerm, setErpSearchTerm] = useState('');

    const defaultFormValues: IngredienteFormValues = {
        id: Date.now().toString(),
        nombreIngrediente: '',
        productoERPlinkId: '',
        alergenosPresentes: [],
        alergenosTrazas: [],
        lastRevision: '',
    };
    
    const form = useForm<IngredienteFormValues>({
        resolver: zodResolver(ingredienteFormSchema),
        defaultValues: initialData || defaultFormValues
    });

    useEffect(() => {
        const storedErpData = localStorage.getItem('articulosERP') || '[]';
        setArticulosERP(JSON.parse(storedErpData));
    }, []);

    useEffect(() => {
        if (open) {
            form.reset(initialData ? { ...initialData } : defaultFormValues);
        }
    }, [initialData, open, form]);


    const selectedErpId = form.watch('productoERPlinkId');
    const selectedErpProduct = useMemo(() => articulosERP.find(p => p.idreferenciaerp === selectedErpId), [articulosERP, selectedErpId]);

    const handleErpSelect = (erpId: string) => {
        form.setValue('productoERPlinkId', erpId, { shouldDirty: true });
        form.trigger('productoERPlinkId'); // Manually trigger validation
    };

    const AlergenosTable = ({ alergenosList }: { alergenosList: readonly Alergeno[] }) => (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60%] p-2">Alérgeno</TableHead>
                        <TableHead className="text-center p-2">Presente</TableHead>
                        <TableHead className="text-center p-2">Trazas</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {alergenosList.map((alergeno) => (
                        <TableRow key={alergeno}>
                            <TableCell className="capitalize p-2 font-medium">{alergeno.toLowerCase().replace('_', ' ')}</TableCell>
                            <TableCell className="text-center p-2">
                                <FormField control={form.control} name="alergenosPresentes" render={({ field }) => (
                                    <FormControl>
                                        <Checkbox checked={field.value?.includes(alergeno)} onCheckedChange={(checked) => {
                                                const newValue = checked ? [...(field.value || []), alergeno] : (field.value || []).filter(v => v !== alergeno);
                                                field.onChange(newValue);
                                                if (checked) form.setValue('alergenosTrazas', (form.getValues('alergenosTrazas') || []).filter(t => t !== alergeno), { shouldDirty: true });
                                        }}/>
                                    </FormControl>
                                )}/>
                            </TableCell>
                            <TableCell className="text-center p-2">
                                <FormField control={form.control} name="alergenosTrazas" render={({ field }) => (
                                    <FormControl>
                                        <Checkbox checked={field.value?.includes(alergeno)} onCheckedChange={(checked) => {
                                                const newValue = checked ? [...(field.value || []), alergeno] : (field.value || []).filter(v => v !== alergeno);
                                                field.onChange(newValue);
                                                if (checked) form.setValue('alergenosPresentes', (form.getValues('alergenosPresentes') || []).filter(p => p !== alergeno), { shouldDirty: true });
                                        }}/>
                                    </FormControl>
                                )}/>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
    const alergenosColumns = React.useMemo(() => [ALERGENOS.slice(0, 7), ALERGENOS.slice(7)], []);

    const calculatePrice = (p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>{initialData ? 'Editar' : 'Nuevo'} Ingrediente</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSave)} id="ingrediente-form-modal" className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-12 gap-4 items-start">
                                    <div className="col-span-5 space-y-4">
                                        <FormField control={form.control} name="nombreIngrediente" render={({ field }) => (
                                            <FormItem><FormLabel>Nombre Ingrediente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <div className="col-span-7">
                                        <FormItem>
                                            <FormLabel>Vínculo con Artículo ERP</FormLabel>
                                            {selectedErpProduct ? (
                                                <div className="border rounded-md p-2 space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-sm leading-tight">{selectedErpProduct.nombreProductoERP}</p>
                                                            <p className="text-xs text-muted-foreground">{selectedErpProduct.nombreProveedor} ({selectedErpProduct.referenciaProveedor})</p>
                                                        </div>
                                                        <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" type="button" onClick={() => form.setValue('productoERPlinkId', '', {shouldDirty: true})}><CircleX className="mr-1 h-3 w-3"/>Desvincular</Button>
                                                    </div>
                                                     <p className="font-bold text-primary text-sm">{calculatePrice(selectedErpProduct).toLocaleString('es-ES',{style:'currency', currency:'EUR'})} / {selectedErpProduct.unidad}</p>
                                                </div>
                                            ) : (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="secondary" className="w-full h-16 border-dashed border-2"><LinkIcon className="mr-2"/>Vincular Artículo ERP</Button>
                                                    </DialogTrigger>
                                                    <ErpSelectorDialog 
                                                        onSelect={handleErpSelect}
                                                        articulosERP={articulosERP}
                                                        searchTerm={erpSearchTerm}
                                                        setSearchTerm={setErpSearchTerm}
                                                    />
                                                </Dialog>
                                            )}
                                            <FormMessage className="mt-2">{form.formState.errors.productoERPlinkId?.message}</FormMessage>
                                        </FormItem>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Gestión de Alérgenos</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                <AlergenosTable alergenosList={alergenosColumns[0]} />
                                <AlergenosTable alergenosList={alergenosColumns[1]} />
                            </CardContent>
                        </Card>
                    </form>
                </Form>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button type="submit" form="ingrediente-form-modal">Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ErpSelectorDialog({ onSelect, articulosERP, searchTerm, setSearchTerm }: { onSelect: (erpId: string) => void; articulosERP: ArticuloERP[]; searchTerm: string, setSearchTerm: (term: string) => void }) {
    
    const filteredErpProducts = useMemo(() => {
        return articulosERP.filter(p => 
            p && (
            (p.nombreProductoERP || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.nombreProveedor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.referenciaProveedor || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [articulosERP, searchTerm]);

    const calculatePrice = (p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    }
    
    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Seleccionar Producto ERP</DialogTitle></DialogHeader>
            <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Proveedor</TableHead><TableHead>Precio</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>{filteredErpProducts.map(p => (
                        <TableRow key={p.idreferenciaerp || p.id}>
                            <TableCell>{p.nombreProductoERP}</TableCell>
                            <TableCell>{p.nombreProveedor}</TableCell>
                            <TableCell>{calculatePrice(p).toLocaleString('es-ES',{style:'currency', currency:'EUR'})}/{p.unidad}</TableCell>
                            <TableCell>
                                <DialogClose asChild>
                                    <Button size="sm" onClick={() => onSelect(p.idreferenciaerp)}><Check className="mr-2"/>Seleccionar</Button>
                                </DialogClose>
                            </TableCell>
                        </TableRow>
                    ))}</TableBody>
                </Table>
            </div>
        </DialogContent>
    )
}

function IngredientesPageContent() {
  const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemToDelete, setItemToDelete] = useState<IngredienteConERP | null>(null);
  const [affectedElaboraciones, setAffectedElaboraciones] = useState<Elaboracion[]>([]);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Partial<IngredienteInterno> | null>(null);

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const loadIngredients = useCallback(() => {
    let storedErp = localStorage.getItem('articulosERP') || '[]';
    const articulosERP = JSON.parse(storedErp) as ArticuloERP[];
    const erpMap = new Map(articulosERP.map(item => [item.idreferenciaerp, item]));

    let storedIngredientes = localStorage.getItem('ingredientesInternos') || '[]';
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
  }, []);

  useEffect(() => {
    loadIngredients();
    setIsMounted(true);
  }, [loadIngredients]);
  
  const handleExportCSV = () => {
    const dataToExport = ingredientes.map(item => {
        const { erp, alergenos, ...rest } = item;
        return {
            ...rest,
            alergenosPresentes: JSON.stringify(item.alergenosPresentes || []),
            alergenosTrazas: JSON.stringify(item.alergenosTrazas || []),
            lastRevision: item.lastRevision || '',
        };
    });
    
    if (dataToExport.length === 0) {
        dataToExport.push(Object.fromEntries(CSV_HEADERS.map(h => [h, ''])));
    }

    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
    
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
  
  const safeJsonParse = (jsonString: string, fallback: any = []) => { try { const parsed = JSON.parse(jsonString); return Array.isArray(parsed) ? parsed : fallback; } catch (e) { return fallback; } };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsImportAlertOpen(false);
      return;
    }

    Papa.parse<any>(file, {
        header: true, skipEmptyLines: true, delimiter,
        complete: (results) => {
            const headers = results.meta.fields || [];
            if (!CSV_HEADERS.every(field => headers.includes(field))) {
                toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
                setIsImportAlertOpen(false);
                return;
            }
            
            const importedData: IngredienteInterno[] = results.data.map(item => ({
                id: item.id || Date.now().toString() + Math.random(),
                nombreIngrediente: item.nombreIngrediente || '',
                productoERPlinkId: item.productoERPlinkId || '',
                alergenosPresentes: safeJsonParse(item.alergenosPresentes),
                alergenosTrazas: safeJsonParse(item.alergenosTrazas),
                lastRevision: item.lastRevision || new Date().toISOString(),
            }));
            
            localStorage.setItem('ingredientesInternos', JSON.stringify(importedData));
            loadIngredients();
            toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
            setIsImportAlertOpen(false);
        },
        error: (error) => {
            toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
            setIsImportAlertOpen(false);
        }
    });
    if(event.target) event.target.value = '';
  };

  const filteredItems = useMemo(() => {
    return ingredientes.filter(item => {
      const term = searchTerm.toLowerCase();
      return (
        item.nombreIngrediente.toLowerCase().includes(term) ||
        (item.erp?.nombreProductoERP || '').toLowerCase().includes(term) ||
        (item.erp?.idreferenciaerp || '').toLowerCase().includes(term) ||
        (item.erp?.familiaCategoria || '').toLowerCase().includes(term)
      );
    });
  }, [ingredientes, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  const handleAttemptDelete = (ingrediente: IngredienteConERP) => {
    const allElaboraciones: Elaboracion[] = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const elaboracionesUsingIngredient = allElaboraciones.filter(elab => 
      elab.componentes.some(c => c.tipo === 'ingrediente' && c.componenteId === ingrediente.id)
    );
    setAffectedElaboraciones(elaboracionesUsingIngredient);
    setItemToDelete(ingrediente);
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    
    let allItems = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const updatedItems = allItems.filter(p => p.id !== itemToDelete.id);
    localStorage.setItem('ingredientesInternos', JSON.stringify(updatedItems));

    if (affectedElaboraciones.length > 0) {
        toast({
            title: 'Recetas marcadas para revisión',
            description: `${affectedElaboraciones.length} elaboración(es) usaban este ingrediente y sus recetas asociadas han sido marcadas para revisión.`
        });
    }

    loadIngredients();
    toast({ title: 'Ingrediente eliminado' });
    setItemToDelete(null);
  };

  const handleSave = (data: IngredienteFormValues) => {
    const allItems = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    let message = '';
    const isEditing = !!(editingIngredient && editingIngredient.id);

    const finalData = { ...data, lastRevision: new Date().toISOString() };
    
    if (isEditing) {
        const index = allItems.findIndex(p => p.id === finalData.id);
        if (index > -1) {
            allItems[index] = finalData;
            message = 'Ingrediente actualizado.';
        }
    } else {
        const existing = allItems.find(p => p.nombreIngrediente.toLowerCase() === finalData.nombreIngrediente.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un ingrediente con este nombre.' });
            return;
        }
        allItems.push(finalData);
        message = 'Ingrediente creado.';
    }

    localStorage.setItem('ingredientesInternos', JSON.stringify(allItems));
    toast({ description: message });
    setEditingIngredient(null);
    loadIngredients();
  };

  if (!isMounted) return <LoadingSkeleton title="Cargando Ingredientes..." />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
          <div></div>
          <div className="flex gap-2">
            <Button onClick={() => setEditingIngredient({})}><PlusCircle className="mr-2" />Nuevo Ingrediente</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Menu /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}><FileUp size={16} className="mr-2"/>Importar CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}><FileDown size={16} className="mr-2"/>Exportar CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-4 mb-4">
          <Input placeholder="Buscar..." className="flex-grow max-w-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader><TableRow><TableHead>Ingrediente</TableHead><TableHead>Producto ERP Vinculado</TableHead><TableHead>Id. ERP</TableHead><TableHead>Categoría ERP</TableHead><TableHead>Alérgenos</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombreIngrediente}</TableCell>
                    <TableCell>
                      {item.erp ? (
                        <div className="flex flex-col">
                            <span className="flex items-center gap-2 text-sm font-semibold"><LinkIcon className="h-4 w-4 text-green-600" />{item.erp.nombreProductoERP}</span>
                             <span className="text-xs text-muted-foreground pl-6">{item.erp.nombreProveedor}</span>
                        </div>
                      ) : <span className="text-destructive text-sm font-semibold">No vinculado</span>}
                    </TableCell>
                     <TableCell>{item.erp?.idreferenciaerp}</TableCell>
                     <TableCell>{item.erp?.familiaCategoria}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{item.alergenos?.length > 0 && item.alergenos.map(alergeno => <AllergenBadge key={alergeno} allergen={alergeno} />)}</div></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingIngredient(item)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleAttemptDelete(item)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron ingredientes.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

      {editingIngredient && (
          <IngredienteFormModal 
              open={!!editingIngredient}
              onOpenChange={(isOpen) => !isOpen && setEditingIngredient(null)}
              initialData={editingIngredient}
              onSave={handleSave}
          />
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {affectedElaboraciones.length > 0 ? (
                <div>
                    <span className="font-bold text-destructive">Este ingrediente se usa en {affectedElaboraciones.length} elaboración(es).</span>
                    <p className="mt-2">Si lo eliminas, las recetas que usen estas elaboraciones podrían tener costes y alérgenos incorrectos. Se recomienda marcarlas para revisión.</p>
                </div>
              ) : 'Esta acción no se puede deshacer. Se eliminará permanentemente el ingrediente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setItemToDelete(null); setAffectedElaboraciones([]); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>{affectedElaboraciones.length > 0 ? 'Eliminar y Marcar Recetas' : 'Eliminar Ingrediente'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle><AlertDialogDescription>Selecciona el tipo de delimitador que utiliza tu archivo CSV.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter className="!justify-center gap-4">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
                    <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
                    <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

export default function IngredientesPageWrapper() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Ingredientes..." />}>
            <IngredientesPageContent />
        </Suspense>
    )
}
