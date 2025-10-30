
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, isBefore, subMonths, startOfToday, isWithinInterval, addYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { Shield, Search, AlertTriangle, Check, Pencil, LinkIcon, CircleX } from 'lucide-react';
import type { IngredienteInterno, ArticuloERP, FamiliaERP, ServiceOrder, Receta, Elaboracion, GastronomyOrder } from '@/types';
import { ALERGENOS } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ingredienteFormSchema = z.object({
  id: z.string(),
  nombreIngrediente: z.string().min(1, 'El nombre es obligatorio'),
  productoERPlinkId: z.string().min(1, 'Debe enlazar un producto ERP'),
  alergenosPresentes: z.array(z.string()).default([]),
  alergenosTrazas: z.array(z.string()).default([]),
});
type IngredienteFormValues = z.infer<typeof ingredienteFormSchema>;

type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

function IngredienteFormModal({ open, onOpenChange, initialData, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; initialData: Partial<IngredienteInterno> | null; onSave: (data: IngredienteFormValues) => void; }) {
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    
    const form = useForm<IngredienteFormValues>({
        resolver: zodResolver(ingredienteFormSchema),
        defaultValues: initialData || { alergenosPresentes: [], alergenosTrazas: [] }
    });

    useEffect(() => {
        const storedErpData = localStorage.getItem('articulosERP') || '[]';
        setArticulosERP(JSON.parse(storedErpData));
        if (open) {
            form.reset(initialData || { id: '', nombreIngrediente: '', productoERPlinkId: '', alergenosPresentes: [], alergenosTrazas: [] });
        }
    }, [initialData, open, form]);

    const erpOptions = useMemo(() => articulosERP.map(p => ({ label: `${p.nombreProductoERP} (${p.nombreProveedor})`, value: p.idreferenciaerp || '' })), [articulosERP]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>{initialData ? 'Editar' : 'Nuevo'} Ingrediente</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSave)} id="ingrediente-form-modal" className="space-y-4">
                        <Card>
                            <CardContent className="pt-6 grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="nombreIngrediente" render={({ field }) => ( <FormItem><FormLabel>Nombre Ingrediente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="productoERPlinkId" render={({ field }) => ( <FormItem><FormLabel>Vínculo con Artículo ERP</FormLabel><Combobox options={erpOptions} value={field.value} onChange={field.onChange} placeholder="Buscar ERP..."/><FormMessage /></FormItem> )} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Gestión de Alérgenos</CardTitle></CardHeader>
                            <CardContent>
                               <div className="border rounded-md">
                                  <Table>
                                    <TableHeader><TableRow><TableHead>Alérgeno</TableHead><TableHead>Presente</TableHead><TableHead>Trazas</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {ALERGENOS.map(alergeno => (
                                            <TableRow key={alergeno}>
                                                <TableCell className="capitalize">{alergeno.toLowerCase().replace('_', ' ')}</TableCell>
                                                <TableCell><FormField control={form.control} name="alergenosPresentes" render={({ field }) => ( <Checkbox checked={field.value?.includes(alergeno)} onCheckedChange={(checked) => { const newValue = checked ? [...field.value, alergeno] : field.value.filter(v => v !== alergeno); field.onChange(newValue); }}/> )}/></TableCell>
                                                <TableCell><FormField control={form.control} name="alergenosTrazas" render={({ field }) => ( <Checkbox checked={field.value?.includes(alergeno)} onCheckedChange={(checked) => { const newValue = checked ? [...field.value, alergeno] : field.value.filter(v => v !== alergeno); field.onChange(newValue); }}/> )}/></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                               </div>
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
    );
}

export default function VerificacionIngredientesPage() {
    const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyPending, setShowOnlyPending] = useState(true);
    const [filterByUsage, setFilterByUsage] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<IngredienteConERP | null>(null);
    const [ingredientesEnUso, setIngredientesEnUso] = useState<Set<string>>(new Set());

    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();

    const loadData = useCallback(() => {
        const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const erpMap = new Map(storedErp.map(item => [item.idreferenciaerp, item]));
        
        const storedFamilias = JSON.parse(localStorage.getItem('familiasERP') || '[]') as FamiliaERP[];
        const familiasMap = new Map(storedFamilias.map(f => [f.familiaCategoria, f.Categoria]));

        const storedIngredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const combinedData = storedIngredientes.map(ing => {
            const erpItem = erpMap.get(ing.productoERPlinkId);
            if(erpItem) {
                erpItem.categoriaMice = familiasMap.get(erpItem.familiaCategoria || '') || erpItem.categoriaMice;
            }
            return { ...ing, erp: erpItem };
        });
        setIngredientes(combinedData);
        
        // Pre-calculate ingredients in use for future events
        const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
        const allGastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]);
        const allRecetas = (JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[]);
        const allElaboraciones = (JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[]);
        const today = startOfToday();
        const oneYearFromNow = addYears(today, 1);

        const recetasEnUsoIds = new Set<string>();
        allServiceOrders.forEach(os => {
            const osDate = new Date(os.startDate);
            if (isWithinInterval(osDate, { start: today, end: oneYearFromNow })) {
                allGastroOrders.filter(go => go.osId === os.id).forEach(pedido => {
                    (pedido.items || []).forEach(item => { if (item.type === 'item') recetasEnUsoIds.add(item.id); });
                });
            }
        });

        const elaboracionesEnUsoIds = new Set<string>();
        allRecetas.forEach(receta => {
            if (recetasEnUsoIds.has(receta.id)) {
                (receta.elaboraciones || []).forEach(elab => elaboracionesEnUsoIds.add(elab.elaboracionId));
            }
        });

        const ingredientesActivos = new Set<string>();
        allElaboraciones.forEach(elab => {
            if (elaboracionesEnUsoIds.has(elab.id)) {
                (elab.componentes || []).forEach(comp => { if (comp.tipo === 'ingrediente') ingredientesActivos.add(comp.componenteId); });
            }
        });
        setIngredientesEnUso(ingredientesActivos);

        setIsMounted(true);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const sixMonthsAgo = useMemo(() => subMonths(startOfToday(), 6), []);

    const filteredItems = useMemo(() => {
        return ingredientes.filter(item => {
            const needsReview = !item.lastRevision || isBefore(new Date(item.lastRevision), sixMonthsAgo);
            if (showOnlyPending && !needsReview) return false;
            
            if (filterByUsage && !ingredientesEnUso.has(item.id)) return false;

            const term = searchTerm.toLowerCase();
            return (
                item.nombreIngrediente.toLowerCase().includes(term) ||
                (item.erp?.nombreProductoERP || '').toLowerCase().includes(term) ||
                (item.erp?.categoriaMice || '').toLowerCase().includes(term) ||
                (item.responsableRevision || '').toLowerCase().includes(term)
            );
        }).sort((a, b) => (a.lastRevision ? new Date(a.lastRevision).getTime() : 0) - (b.lastRevision ? new Date(b.lastRevision).getTime() : 0));
    }, [ingredientes, searchTerm, showOnlyPending, filterByUsage, sixMonthsAgo, ingredientesEnUso]);
    
    const handleSave = (data: IngredienteFormValues) => {
        if (!impersonatedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo identificar al usuario.' });
            return;
        }

        const allItems = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const index = allItems.findIndex(i => i.id === data.id);

        const updatedItem: IngredienteInterno = {
            ...data,
            lastRevision: new Date().toISOString(),
            responsableRevision: impersonatedUser.nombre,
        };

        if (index > -1) {
            allItems[index] = updatedItem;
        } else {
            allItems.push(updatedItem);
        }
        
        localStorage.setItem('ingredientesInternos', JSON.stringify(allItems));
        toast({ title: 'Ingrediente guardado y verificado.' });
        setEditingIngredient(null);
        loadData();
    };
    
    const handleValidate = (item: IngredienteConERP) => {
      handleSave({
        id: item.id,
        nombreIngrediente: item.nombreIngrediente,
        productoERPlinkId: item.productoERPlinkId,
        alergenosPresentes: item.alergenosPresentes || [],
        alergenosTrazas: item.alergenosTrazas || [],
      });
    }

    if (!isMounted) return <LoadingSkeleton title="Cargando Verificación de Ingredientes..." />;

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Shield />Verificación de Ingredientes</h1>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border rounded-lg bg-card">
                <Input placeholder="Buscar por nombre, ERP, categoría..." className="max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <div className="flex items-center space-x-2"><Checkbox id="showPending" checked={showOnlyPending} onCheckedChange={(checked) => setShowOnlyPending(Boolean(checked))} /><Label htmlFor="showPending">Mostrar solo pendientes de revisión</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="filterUsage" checked={filterByUsage} onCheckedChange={(checked) => setFilterByUsage(Boolean(checked))} /><Label htmlFor="filterUsage">Filtrar por uso en eventos futuros</Label></div>
            </div>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader><TableRow><TableHead>Ingrediente</TableHead><TableHead>Producto ERP Vinculado</TableHead><TableHead>Categoría MICE</TableHead><TableHead>Última Revisión</TableHead><TableHead>Responsable</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredItems.length > 0 ? (
                            filteredItems.map(item => {
                                const needsReview = !item.lastRevision || isBefore(new Date(item.lastRevision), sixMonthsAgo);
                                return (
                                    <TableRow key={item.id} className={cn(needsReview && 'bg-amber-50')}>
                                        <TableCell className="font-medium">{item.nombreIngrediente}</TableCell>
                                        <TableCell>{item.erp?.nombreProductoERP || <span className="text-destructive">No Vinculado</span>}</TableCell>
                                        <TableCell>{item.erp?.categoriaMice || '-'}</TableCell>
                                        <TableCell className={cn(needsReview && 'text-destructive font-bold')}>
                                            {item.lastRevision ? format(new Date(item.lastRevision), 'dd/MM/yyyy') : 'Nunca'}
                                            {needsReview && <AlertTriangle className="inline ml-2 h-4 w-4" />}
                                        </TableCell>
                                        <TableCell>{item.responsableRevision || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="secondary" onClick={() => handleValidate(item)}><Check className="mr-2 h-4 w-4" />Validar</Button>
                                                <Button size="sm" variant="outline" onClick={() => setEditingIngredient(item)}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (<TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron ingredientes.</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
            {editingIngredient && <IngredienteFormModal open={!!editingIngredient} onOpenChange={() => setEditingIngredient(null)} initialData={editingIngredient} onSave={handleSave}/>}
        </>
    );
}
