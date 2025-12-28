'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
    Search, 
    PlusCircle, 
    X, 
    AlertCircle, 
    Activity, 
    ChevronLeft, 
    ChevronsRight, 
    Check 
} from 'lucide-react';
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ALERGENOS, type Alergeno, type IngredienteInterno, type ArticuloERP } from '@/types';

const ingredienteFormSchema = z.object({
    id: z.string(),
    nombreIngrediente: z.string().min(1, 'El nombre es obligatorio'),
    productoERPlinkId: z.string().optional(),
    alergenosPresentes: z.array(z.string()),
    alergenosTrazas: z.array(z.string()),
});

type IngredienteFormValues = z.infer<typeof ingredienteFormSchema>;

const AlergenoIcon = ({ name, className }: { name: string, className?: string }) => {
    return <span className={cn("font-bold text-xs uppercase", className)}>{name.substring(0,3)}</span>
}

interface IngredienteFormProps {
    ingrediente: Partial<IngredienteInterno>;
    articulosERP: ArticuloERP[];
    onSave: (data: IngredienteFormValues, action: 'save' | 'save_next') => void;
    onCancel: () => void;
    isMobile: boolean;
    hasPrev: boolean;
    hasNext: boolean;
    onNavigate: (direction: 'prev' | 'next') => void;
}

export function IngredienteForm({
    ingrediente,
    articulosERP,
    onSave,
    onCancel,
    isMobile,
    hasPrev,
    hasNext,
    onNavigate
}: IngredienteFormProps) {
    const [erpSearchTerm, setErpSearchTerm] = useState('');
    const [alergenoTab, setAlergenoTab] = useState<'presentes' | 'trazas'>('presentes');

    const form = useForm<IngredienteFormValues>({
        resolver: zodResolver(ingredienteFormSchema),
        defaultValues: {
            id: ingrediente.id || crypto.randomUUID(),
            nombreIngrediente: ingrediente.nombreIngrediente || '',
            productoERPlinkId: ingrediente.productoERPlinkId || '',
            alergenosPresentes: ingrediente.alergenosPresentes || [],
            alergenosTrazas: ingrediente.alergenosTrazas || [],
        }
    });

    useEffect(() => {
        form.reset({
            id: ingrediente.id || crypto.randomUUID(),
            nombreIngrediente: ingrediente.nombreIngrediente || '',
            productoERPlinkId: ingrediente.productoERPlinkId || '',
            alergenosPresentes: ingrediente.alergenosPresentes || [],
            alergenosTrazas: ingrediente.alergenosTrazas || [],
        });
    }, [ingrediente, form]);

    const currentPresentes = form.watch('alergenosPresentes');
    const currentTrazas = form.watch('alergenosTrazas');

    const toggleAlergeno = (alergeno: Alergeno, type: 'presentes' | 'trazas') => {
        if (type === 'presentes') {
            const newValue = currentPresentes.includes(alergeno)
                ? currentPresentes.filter(a => a !== alergeno)
                : [...currentPresentes, alergeno];
            form.setValue('alergenosPresentes', newValue, { shouldDirty: true });
            
            // Si se marca como presente, quitar de trazas
            if (currentTrazas.includes(alergeno)) {
                form.setValue('alergenosTrazas', currentTrazas.filter(a => a !== alergeno), { shouldDirty: true });
            }
        } else {
            const newValue = currentTrazas.includes(alergeno)
                ? currentTrazas.filter(a => a !== alergeno)
                : [...currentTrazas, alergeno];
            form.setValue('alergenosTrazas', newValue, { shouldDirty: true });
        }
    };

    const filteredErpList = useMemo(() => {
        if (erpSearchTerm.length < 3) return [];
        const term = erpSearchTerm.toLowerCase();
        return articulosERP.filter(item => 
            item.nombreProductoERP.toLowerCase().includes(term) ||
            (item.nombreProveedor || '').toLowerCase().includes(term) ||
            (item.referenciaProveedor || '').toLowerCase().includes(term)
        ).slice(0, 10);
    }, [erpSearchTerm, articulosERP]);

    const selectedErpProduct = useMemo(() => {
        const linkId = form.watch('productoERPlinkId');
        if (!linkId) return null;
        return articulosERP.find(a => a.idreferenciaerp === linkId);
    }, [form.watch('productoERPlinkId'), articulosERP]);

    return (
        <Form {...form}>
            <form className="flex flex-col h-full">
                <ScrollArea className="flex-1 px-4 py-4">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <FormField control={form.control} name="nombreIngrediente" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Nombre Interno</FormLabel>
                                    <FormControl><Input {...field} className="text-lg font-bold" /></FormControl>
                                </FormItem>
                            )} />

                            <div className="space-y-2">
                                <FormLabel className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Artículo ERP Vinculado</FormLabel>
                                {selectedErpProduct ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 relative group">
                                        <div className="pr-8">
                                            <p className="font-bold text-emerald-900 text-sm leading-tight">{selectedErpProduct.nombreProductoERP}</p>
                                            <div className="flex gap-2 text-xs text-emerald-700 mt-1">
                                                <span>{selectedErpProduct.nombreProveedor}</span>
                                                <span>•</span>
                                                <span className="font-mono">{selectedErpProduct.referenciaProveedor}</span>
                                            </div>
                                            <div className="mt-2 font-bold text-emerald-800">
                                                {((selectedErpProduct.precioCompra || 0) / (selectedErpProduct.unidadConversion || 1)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} / {selectedErpProduct.unidad}
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute top-1 right-1 h-6 w-6 text-emerald-700 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => { form.setValue('productoERPlinkId', '', { shouldDirty: true }); setErpSearchTerm(''); }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="Buscar en ERP (min 3 letras)..." 
                                                value={erpSearchTerm}
                                                onChange={(e) => setErpSearchTerm(e.target.value)}
                                                className="pl-8 bg-muted/20"
                                            />
                                        </div>
                                        {filteredErpList.length > 0 && (
                                            <div className="border rounded-md shadow-sm max-h-48 overflow-y-auto bg-white divide-y">
                                                {filteredErpList.map(item => (
                                                    <button 
                                                        key={item.id} 
                                                        type="button"
                                                        className="w-full text-left p-2 hover:bg-muted text-sm flex justify-between items-center group"
                                                        onClick={() => {
                                                            form.setValue('productoERPlinkId', item.idreferenciaerp || '', { shouldDirty: true });
                                                            setErpSearchTerm('');
                                                        }}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium truncate">{item.nombreProductoERP}</div>
                                                            <div className="text-xs text-muted-foreground">{item.nombreProveedor}</div>
                                                        </div>
                                                        <PlusCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {erpSearchTerm.length > 2 && filteredErpList.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-2">No se encontraron productos.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Tabs value={alergenoTab} onValueChange={(v) => setAlergenoTab(v as 'presentes' | 'trazas')} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 h-8">
                                    <TabsTrigger value="presentes" className="flex items-center gap-0.5 text-xs py-0.5 px-1">
                                        <div className="p-0.5 bg-red-100 text-red-700 rounded text-xs"><AlertCircle className="w-2.5 h-2.5" /></div>
                                        <span>Contiene</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="trazas" className="flex items-center gap-0.5 text-xs py-0.5 px-1">
                                        <div className="p-0.5 bg-amber-100 text-amber-700 rounded text-xs"><Activity className="w-2.5 h-2.5" /></div>
                                        <span>Trazas</span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="presentes" className="space-y-1 mt-2">
                                    <div className="flex items-center gap-1 mb-1">
                                        <div className="p-0.5 bg-red-100 rounded text-red-700"><AlertCircle className="w-2 h-2" /></div>
                                        <h4 className="font-bold text-[10px] uppercase text-red-900">Contiene</h4>
                                    </div>
                                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-1">
                                        {ALERGENOS.map((alergeno) => {
                                            const isSelected = currentPresentes?.includes(alergeno);
                                            return (
                                                <button
                                                    key={`presente-${alergeno}`}
                                                    type="button"
                                                    onClick={() => toggleAlergeno(alergeno, 'presentes')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-1 rounded-md border transition-all text-center h-14",
                                                        isSelected 
                                                            ? "bg-red-50 border-red-500 text-red-700 shadow-sm ring-1 ring-red-500" 
                                                            : "bg-white border-muted hover:border-red-200 hover:bg-red-50/30 text-muted-foreground"
                                                    )}
                                                >
                                                    <AlergenoIcon name={alergeno} className={cn("text-sm mb-0.5", isSelected && "scale-110")} />
                                                    <span className="text-[7px] font-medium leading-tight">{alergeno.replace('_', ' ')}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </TabsContent>

                                <TabsContent value="trazas" className="space-y-1 mt-2">
                                    <div className="flex items-center gap-1 mb-1">
                                        <div className="p-0.5 bg-amber-100 rounded text-amber-700"><Activity className="w-2 h-2" /></div>
                                        <h4 className="font-bold text-[10px] uppercase text-amber-900">Puede Contener</h4>
                                    </div>
                                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-1">
                                        {ALERGENOS.map((alergeno) => {
                                            const isSelected = currentTrazas?.includes(alergeno);
                                            const isPresente = currentPresentes?.includes(alergeno);
                                            
                                            return (
                                                <button
                                                    key={`traza-${alergeno}`}
                                                    type="button"
                                                    disabled={isPresente}
                                                    onClick={() => toggleAlergeno(alergeno, 'trazas')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-1 rounded-md border transition-all text-center h-12",
                                                        isPresente && "opacity-20 cursor-not-allowed bg-gray-50 border-transparent",
                                                        !isPresente && isSelected && "bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-1 ring-amber-500",
                                                        !isPresente && !isSelected && "bg-white border-muted hover:border-amber-200 hover:bg-amber-50/30 text-muted-foreground"
                                                    )}
                                                >
                                                    <span className="text-[7px] font-medium leading-tight">{alergeno.replace('_', ' ')}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </ScrollArea>

                <div className="px-4 py-3 border-t bg-background/95 backdrop-blur flex items-center justify-between gap-2 sticky bottom-0">
                    <Button variant="outline" type="button" size="sm" onClick={() => onNavigate('prev')} disabled={!hasPrev} className="h-8 w-8 p-0">
                         <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex gap-2 flex-1 justify-end">
                         <Button variant="secondary" type="button" onClick={form.handleSubmit((d) => onSave(d, 'save'))} className="hidden sm:flex" size="sm">
                            Guardar
                         </Button>

                         <Button 
                            type="button"
                            className={cn("flex-1 sm:flex-none sm:w-auto font-bold shadow-md", hasNext ? "bg-emerald-600 hover:bg-emerald-700" : "")} 
                            size="sm"
                            onClick={form.handleSubmit((d) => onSave(d, 'save_next'))}
                         >
                            {hasNext ? 'Siguiente' : 'Finalizar'}
                            {hasNext ? <ChevronsRight className="ml-1 h-4 w-4" /> : <Check className="ml-1 h-4 w-4" />}
                         </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
