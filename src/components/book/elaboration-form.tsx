

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Component, ChefHat, PlusCircle, Trash2, Image as ImageIcon, Link as LinkIcon, Component as SubElabIcon, RefreshCw, Sprout, AlertTriangle } from 'lucide-react';
import type { Elaboracion, IngredienteInterno, UnidadMedida, ArticuloERP, PartidaProduccion, FormatoExpedicion, Alergeno } from '@/types';
import { UNIDADES_MEDIDA, ALERGENOS } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency, formatUnit } from '@/lib/utils';
import Image from 'next/image';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AllergenBadge } from '../icons/allergen-badge';
import { ComponenteSelector } from '@/components/book/componente-selector';
import { Switch } from '../ui/switch';

const componenteSchema = z.object({
    id: z.string(),
    tipo: z.enum(['ingrediente', 'elaboracion']),
    componenteId: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().min(0.001, 'La cantidad debe ser mayor que 0'),
    costePorUnidad: z.coerce.number().optional().default(0),
    merma: z.coerce.number().optional().default(0),
});

const elaboracionFormSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  produccionTotal: z.coerce.number().min(0.001, 'La producción total es obligatoria'),
  unidadProduccion: z.enum(UNIDADES_MEDIDA),
  partidaProduccion: z.enum(['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION']),
  componentes: z.array(componenteSchema).min(1, 'Debe tener al menos un componente'),
  instruccionesPreparacion: z.string().optional().default(''),
  fotosProduccionURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
  videoProduccionURL: z.string().url().or(z.literal('')).optional(),
  formatoExpedicion: z.string().optional().default(''),
  ratioExpedicion: z.coerce.number().optional().default(0),
  tipoExpedicion: z.enum(['REFRIGERADO', 'CONGELADO', 'SECO']),
  requiereRevision: z.boolean().optional().default(false),
  comentarioRevision: z.string().optional().default(''),
  fechaRevision: z.string().optional(),
});

export type ElaborationFormValues = z.infer<typeof elaboracionFormSchema>;
type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export function ElaborationForm({ initialData, onSave, isSubmitting }: { initialData: Partial<ElaborationFormValues> | null, onSave: (data: ElaborationFormValues, costePorUnidad: number) => void | Promise<void>, isSubmitting: boolean }) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [ingredientesData, setIngredientesData] = useState<Map<string, IngredienteConERP>>(new Map());
  const [elaboracionesData, setElaboracionesData] = useState<Map<string, Elaboracion>>(new Map());
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formatosExpedicion, setFormatosExpedicion] = useState<FormatoExpedicion[]>([]);
  const { toast } = useToast();

  const form = useForm<ElaborationFormValues>({
    resolver: zodResolver(elaboracionFormSchema),
    defaultValues: initialData || {}
  });

  const { fields, append, remove, control } = useFieldArray({
      control: form.control,
      name: 'componentes',
  });
  
  const { fields: fotosFields, append: appendFoto, remove: removeFoto } = useFieldArray({
      control: form.control,
      name: 'fotosProduccionURLs',
  });

  const watchedComponentes = form.watch('componentes');
  const watchedProduccionTotal = form.watch('produccionTotal');

  useEffect(() => {
    form.reset(initialData || {});
  }, [initialData, form]);

  useEffect(() => {
    const storedFormatos = JSON.parse(localStorage.getItem('formatosExpedicionDB') || '[]') as FormatoExpedicion[];
    setFormatosExpedicion(storedFormatos);

    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
    const combinedIngredientes = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
    setIngredientesData(new Map(combinedIngredientes.map(i => [i.id, i])));

    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    setElaboracionesData(new Map(allElaboraciones.map(e => [e.id, e])));
  }, []);

  const handleSelectIngrediente = (ingrediente: IngredienteConERP) => {
      const erpItem = ingrediente.erp;
      const costeReal = erpItem ? (erpItem.precioCompra / (erpItem.unidadConversion || 1)) * (1 - (erpItem.descuento || 0) / 100) : 0;
      
      append({
          id: `${ingrediente.id}-${Date.now()}`,
          tipo: 'ingrediente',
          componenteId: ingrediente.id,
          nombre: ingrediente.nombreIngrediente,
          cantidad: 1,
          costePorUnidad: costeReal,
          merma: 0,
      });
      setIsSelectorOpen(false);
  }

  const handleSelectElaboracion = (elab: Elaboracion) => {
    append({
        id: `${elab.id}-${Date.now()}`,
        tipo: 'elaboracion',
        componenteId: elab.id,
        nombre: elab.nombre,
        cantidad: 1,
        costePorUnidad: elab.costePorUnidad || 0,
        merma: 0,
    });
    setIsSelectorOpen(false);
  }
  
  const handleAddImageUrl = () => {
    try {
        const url = new URL(newImageUrl);
        appendFoto({ value: url.href });
        setNewImageUrl('');
    } catch(e) {
        toast({ variant: 'destructive', title: 'URL inválida', description: 'Por favor, introduce una URL de imagen válida.'});
    }
  }

  const { costeTotal, costePorUnidad, alergenosPresentes, alergenosTrazas } = useMemo(() => {
    let total = 0;
    const presentes = new Set<Alergeno>();
    const trazas = new Set<Alergeno>();

    const getElabAllergens = (elabId: string): { presentes: Alergeno[], trazas: Alergeno[] } => {
        const elaboracion = elaboracionesData.get(elabId);
        if (!elaboracion) return { presentes: [], trazas: [] };
        
        const elabPresentes = new Set<Alergeno>();
        const elabTrazas = new Set<Alergeno>();

        (elaboracion.componentes || []).forEach(comp => {
            if (comp.tipo === 'ingrediente') {
                const ing = ingredientesData.get(comp.componenteId);
                if (ing) {
                    (ing.alergenosPresentes || []).forEach(a => elabPresentes.add(a));
                    (ing.alergenosTrazas || []).forEach(a => elabTrazas.add(a));
                }
            } else if (comp.tipo === 'elaboracion') {
                const subElabAllergens = getElabAllergens(comp.componenteId);
                subElabAllergens.presentes.forEach(a => elabPresentes.add(a));
                subElabAllergens.trazas.forEach(a => elabTrazas.add(a));
            }
        });
        return { presentes: Array.from(elabPresentes), trazas: Array.from(elabTrazas) };
    }

    (watchedComponentes || []).forEach(componente => {
        const costeConMerma = (componente.costePorUnidad || 0) * (1 + (componente.merma || 0) / 100);
        total += costeConMerma * componente.cantidad;

        if (componente.tipo === 'ingrediente') {
            const ingData = ingredientesData.get(componente.componenteId);
            if (ingData) {
                (ingData.alergenosPresentes || []).forEach(a => presentes.add(a));
                (ingData.alergenosTrazas || []).forEach(a => trazas.add(a));
            }
        } else if (componente.tipo === 'elaboracion') {
            const subElabAllergens = getElabAllergens(componente.componenteId);
            subElabAllergens.presentes.forEach(a => presentes.add(a));
            subElabAllergens.trazas.forEach(a => trazas.add(a));
        }
    });

    // Remove trazas if they are also present
    trazas.forEach(traza => {
        if(presentes.has(traza)) {
            trazas.delete(traza);
        }
    })

    const produccionTotal = watchedProduccionTotal > 0 ? watchedProduccionTotal : 1;
    const porUnidad = produccionTotal > 0 ? total / produccionTotal : 0;
    
    return { 
        costeTotal: total, 
        costePorUnidad: porUnidad,
        alergenosPresentes: Array.from(presentes).sort((a,b) => ALERGENOS.indexOf(a) - ALERGENOS.indexOf(b)),
        alergenosTrazas: Array.from(trazas).sort((a,b) => ALERGENOS.indexOf(a) - ALERGENOS.indexOf(b)),
    };
  }, [watchedComponentes, watchedProduccionTotal, ingredientesData, elaboracionesData]);
  
  const handleFormSubmit = (data: ElaborationFormValues) => {
    if (onSave) {
        if (data.requiereRevision && !data.fechaRevision) {
            data.fechaRevision = new Date().toISOString();
        }
        onSave(data, costePorUnidad);
    }
  };
  
  const forceRecalculate = () => {
    // This is a hack, but it forces the useMemo to re-run by "touching" its dependencies
    const currentValues = form.getValues('componentes');
    form.setValue('componentes', [...currentValues]);
    toast({title: 'Cálculo forzado', description: 'Los costes y alérgenos han sido recalculados.'});
  }

  return (
    <TooltipProvider>
    <Form {...form}>
      <form id="elaboration-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Info. General</TabsTrigger>
                <TabsTrigger value="componentes">Componentes</TabsTrigger>
                <TabsTrigger value="preparacion">Info. preparación</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-4">
                 <Card>
                    <CardHeader className="flex-row justify-between items-start py-3">
                        <div><CardTitle className="text-lg">Información General</CardTitle></div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <FormField control={form.control} name="nombre" render={({ field }) => (
                                <FormItem className="flex-1 flex items-center gap-2"><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="partidaProduccion" render={({ field }) => (
                                <FormItem className="flex-1 flex items-center gap-2"><FormLabel>Partida</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="FRIO">FRIO</SelectItem>
                                            <SelectItem value="CALIENTE">CALIENTE</SelectItem>
                                            <SelectItem value="PASTELERIA">PASTELERIA</SelectItem>
                                            <SelectItem value="EXPEDICION">EXPEDICION</SelectItem>
                                        </SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                            <FormField control={form.control} name="requiereRevision" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Requiere Revisión</FormLabel>
                                    <p className="text-sm text-muted-foreground">Marca esta opción si la elaboración necesita ser revisada.</p>
                                </div>
                                </FormItem>
                            )} />
                            {form.watch('requiereRevision') && (
                                <FormField control={form.control} name="comentarioRevision" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Comentario de Revisión</FormLabel>
                                        <FormControl><Textarea {...field} placeholder="Describe por qué necesita revisión..." rows={2} /></FormControl>
                                    </FormItem>
                                )} />
                            )}
                        </div>
                        <Card>
                          <CardHeader className="flex-row items-start justify-between">
                              <CardTitle className="text-lg">Coste de la Elaboración</CardTitle>
                              <div className="text-right">
                                  <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" type="button" onClick={forceRecalculate}>
                                          <RefreshCw className="h-4 w-4" />
                                      </Button>
                                      <p className="text-xs text-muted-foreground">Coste / {formatUnit(form.watch('unidadProduccion'))}</p>
                                  </div>
                                  <p className="font-bold text-xl text-primary">{formatCurrency(costePorUnidad)}</p>
                              </div>
                          </CardHeader>
                          <CardContent>
                              <p className="text-sm text-muted-foreground">Coste total de materia prima: {formatCurrency(costeTotal)}</p>
                          </CardContent>
                        </Card>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="componentes" className="mt-4">
                 <Card>
                    <CardHeader className="flex-row items-center justify-between py-3">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-lg"><Component />Componentes</CardTitle>
                        </div>
                         <div className="flex items-center gap-4">
                            <FormField control={form.control} name="produccionTotal" render={({ field }) => (
                                <FormItem className="flex items-center gap-2"><FormLabel>Producir</FormLabel><FormControl><Input type="number" step="any" {...field} className="w-24 h-9"/></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="unidadProduccion" render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="w-24 h-9"><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{formatUnit(u)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" type="button"><PlusCircle className="mr-2"/>Añadir</Button>
                                </DialogTrigger>
                                <ComponenteSelector 
                                    onSelectIngrediente={handleSelectIngrediente} 
                                    onSelectElaboracion={handleSelectElaboracion} 
                                    allElaboraciones={Array.from(elaboracionesData.values())} 
                                    onOpenChange={setIsSelectorOpen}
                                />
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader><TableRow><TableHead className="py-2 px-3">Componente</TableHead><TableHead className="w-40 py-2 px-3">Cantidad</TableHead><TableHead className="w-24 py-2 px-3">% Merma</TableHead><TableHead className="w-40 py-2 px-3">Unidad</TableHead><TableHead className="w-12 py-2 px-3"></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {fields.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center">Añade un componente para empezar.</TableCell></TableRow>}
                                    {fields.map((field, index) => {
                                        const componenteData = field.tipo === 'ingrediente'
                                            ? ingredientesData.get(field.componenteId)
                                            : elaboracionesData.get(field.componenteId);
                                        
                                        const unidad = field.tipo === 'ingrediente'
                                            ? (componenteData as IngredienteConERP)?.erp?.unidad || 'UD'
                                            : (componenteData as Elaboracion)?.unidadProduccion || 'UD';
                                        
                                        let tooltipText = `Coste unitario: ${formatCurrency(field.costePorUnidad)} / ${formatUnit(unidad)}`;
                                        if (field.tipo === 'ingrediente') {
                                            const erpData = (componenteData as IngredienteConERP)?.erp;
                                            if(erpData?.nombreProveedor) tooltipText += ` | ${erpData.nombreProveedor}`;
                                            if(erpData?.referenciaProveedor) tooltipText += ` (Ref: ${erpData.referenciaProveedor})`;
                                        }

                                        return (
                                            <TableRow key={field.id}>
                                                <TableCell className="font-medium py-1 px-3">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-2">
                                                                {field.tipo === 'ingrediente' ? <ChefHat size={16} className="text-muted-foreground"/> : <SubElabIcon size={16} className="text-muted-foreground"/>}
                                                                {field.nombre}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-sm">{tooltipText}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="py-1 px-3">
                                                    <FormField control={form.control} name={`componentes.${index}.cantidad`} render={({ field: qField }) => (
                                                        <FormItem><FormControl><Input type="number" step="any" {...qField} className="h-8" /></FormControl></FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="py-1 px-3">
                                                    <FormField control={form.control} name={`componentes.${index}.merma`} render={({ field: mField }) => (
                                                        <FormItem><FormControl><Input type="number" step="any" {...mField} className="h-8" /></FormControl></FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="py-1 px-3">
                                                    {formatUnit(unidad)}
                                                </TableCell>
                                                <TableCell className="py-1 px-3"><Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        {form.formState.errors.componentes && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.componentes.message}</p>}
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-3 mt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Sprout/>Resumen de Alérgenos</h4>
                        <div className="w-full space-y-2">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground mb-1">Presentes:</p>
                                <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                    {alergenosPresentes.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {alergenosPresentes.map(a => <AllergenBadge key={a} allergen={a}/>)}
                                        </div>
                                    ) : <p className="text-xs text-muted-foreground italic">Ninguno</p>}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground mb-1">Trazas:</p>
                                <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                    {alergenosTrazas.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {alergenosTrazas.map(a => <AllergenBadge key={a} allergen={a} isTraza/>)}
                                        </div>
                                    ) : <p className="text-xs text-muted-foreground italic">Ninguna</p>}
                                </div>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="preparacion" className="mt-4">
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-lg">Instrucciones y Medios</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="instruccionesPreparacion" render={({ field }) => (
                            <FormItem><FormLabel>Instrucciones de Preparación</FormLabel><FormControl><Textarea {...field} rows={6} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="videoProduccionURL" render={({ field }) => (
                            <FormItem><FormLabel>URL Vídeo Producción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="space-y-2">
                            <FormLabel>Fotos de Producción</FormLabel>
                            <div className="flex gap-2">
                                <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Pega una URL de imagen..."/>
                                <Button type="button" variant="outline" onClick={handleAddImageUrl}><LinkIcon className="mr-2"/>Añadir URL</Button>
                            </div>
                            {form.formState.errors.fotosProduccionURLs && <p className="text-sm font-medium text-destructive">{(form.formState.errors.fotosProduccionURLs as any).message}</p>}
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                {fotosFields.map((field, index) => (
                                    <div key={field.id} className="relative aspect-video rounded-md overflow-hidden group">
                                        <Image src={(field as any).value} alt={`Foto de producción ${index+1}`} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button type="button" variant="destructive" size="icon" onClick={() => removeFoto(index)}><Trash2/></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-base">Datos de Expedición</CardTitle>
                                <CardDescription className="text-xs">Define cómo se empaqueta y conserva esta elaboración.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="formatoExpedicion" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Formato Expedición</FormLabel>
                                        <Combobox
                                            options={formatosExpedicion.map(f => ({ value: f.nombre, label: f.nombre }))}
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            placeholder="Ej: Barqueta 1kg"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="ratioExpedicion" render={({ field }) => (
                                        <FormItem><FormLabel>Ratio Expedición</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="tipoExpedicion" render={({ field }) => (
                                        <FormItem><FormLabel>Tipo de Expedición</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="REFRIGERADO">Refrigerado</SelectItem>
                                                    <SelectItem value="CONGELADO">Congelado</SelectItem>
                                                    <SelectItem value="SECO">Seco</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )} />
                                </div>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </form>
    </Form>
    </TooltipProvider>
  );
}
