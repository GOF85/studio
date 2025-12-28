'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useDevoluciones, useMermas, useOSEstadoCierre, useIncidenciasMaterial, useLogisticaLogs } from '@/hooks/use-os-logistics';
import { useMaterialOrders, useGastronomyOrders, useEvento, useArticulos } from '@/hooks/use-data-queries';
import { Loader2, Save, AlertTriangle, CheckCircle2, History, Camera } from 'lucide-react';
import type { MaterialOrder, GastronomyOrder, Devolucion, Merma, IncidenciaMaterial, OSEstadoCierre } from '@/types';

interface DevolucionesWizardProps {
    osId: string;
}

export function DevolucionesWizard({ osId }: DevolucionesWizardProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('Bodega');
    const [isSaving, setIsSaving] = useState(false);

    // Supabase OS data
    const { data: serviceOrder } = useEvento(osId);

    // Data fetching
    const { data: materialOrders, isLoading: loadingMaterial } = useMaterialOrders(serviceOrder?.id);
    const { data: gastronomyOrders, isLoading: loadingGastro } = useGastronomyOrders(serviceOrder?.id);
    const { data: articulos = [] } = useArticulos();
    const { loadDevoluciones, saveDevolucion } = useDevoluciones();
    const { loadMermas, saveMerma } = useMermas();
    const { loadEstadoCierre } = useOSEstadoCierre();
    const { saveLog } = useLogisticaLogs();

    const [existingDevoluciones, setExistingDevoluciones] = useState<Devolucion[]>([]);
    const [existingMermas, setExistingMermas] = useState<Merma[]>([]);
    const [estadoCierre, setEstadoCierre] = useState<OSEstadoCierre | null>(null);

    // Local state for inputs
    const [inputs, setInputs] = useState<Record<string, { dev: number, merma: number, obs: string }>>({});

    useEffect(() => {
        const fetchData = async () => {
            const [devs, mermas, estado] = await Promise.all([
                loadDevoluciones(osId),
                loadMermas(osId),
                loadEstadoCierre(osId)
            ]);
            setExistingDevoluciones(devs);
            setExistingMermas(mermas);
            setEstadoCierre(estado);
        };
        if (osId) fetchData();
    }, [osId, loadDevoluciones, loadMermas, loadEstadoCierre]);

    const modules = ['Bodega', 'Bio', 'Almacen', 'Alquiler'];

    const filteredItems = useMemo(() => {
        if (!materialOrders) return [];
        return materialOrders
            .filter((o: MaterialOrder) => o.type === activeTab)
            .flatMap((o: MaterialOrder) => o.items.map(item => ({
                ...item,
                orderId: o.id,
                module: o.type
            })));
    }, [materialOrders, activeTab]);

    const getTotals = (articuloId: string) => {
        const devTotal = existingDevoluciones
            .filter(d => d.articulo_id === articuloId)
            .reduce((sum, d) => sum + d.cantidad, 0);
        const mermaTotal = existingMermas
            .filter(m => m.articulo_id === articuloId)
            .reduce((sum, m) => sum + m.cantidad, 0);
        return { devTotal, mermaTotal };
    };

    const handleInputChange = (articuloId: string, field: 'dev' | 'merma' | 'obs', value: any) => {
        setInputs(prev => ({
            ...prev,
            [articuloId]: {
                ...(prev[articuloId] || { dev: 0, merma: 0, obs: '' }),
                [field]: value
            }
        }));
    };

    const handleSave = async (articuloId: string, maxPedido: number) => {
        const input = inputs[articuloId];
        if (!input || (input.dev === 0 && input.merma === 0)) return;

        const { devTotal, mermaTotal } = getTotals(articuloId);
        if (devTotal + mermaTotal + input.dev + input.merma > maxPedido) {
            toast({
                title: 'Error de validación',
                description: 'La suma de devoluciones y mermas no puede superar el pedido original.',
                variant: 'destructive'
            });
            return;
        }

        setIsSaving(true);
        try {
            const articulo = articulos.find(a => a.erpId === articuloId);
            const nombreArticulo = articulo?.nombre || articuloId;

            if (input.dev > 0) {
                await saveDevolucion({
                    os_id: osId,
                    articulo_id: articuloId,
                    cantidad: input.dev,
                    modulo: activeTab,
                    observaciones: input.obs
                });
                await saveLog(osId, 'REGISTRO_DEVOLUCION', {
                    articulo: nombreArticulo,
                    cantidad: input.dev,
                    modulo: activeTab
                });
            }
            if (input.merma > 0) {
                // Buscar el precio de reposición del artículo
                const precioReposicion = articulo?.precioReposicion || 0;
                const costeImpacto = input.merma * precioReposicion;

                await saveMerma({
                    os_id: osId,
                    articulo_id: articuloId,
                    cantidad: input.merma,
                    motivo: 'Registrado desde Wizard',
                    coste_impacto: costeImpacto,
                    observaciones: input.obs
                });
                await saveLog(osId, 'REGISTRO_MERMA', {
                    articulo: nombreArticulo,
                    cantidad: input.merma,
                    coste: costeImpacto
                });
            }

            toast({ title: 'Registrado correctamente' });
            
            // Refresh data
            const [devs, mermas] = await Promise.all([
                loadDevoluciones(osId),
                loadMermas(osId)
            ]);
            setExistingDevoluciones(devs);
            setExistingMermas(mermas);
            setInputs(prev => ({ ...prev, [articuloId]: { dev: 0, merma: 0, obs: '' } }));
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingMaterial || loadingGastro) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3">Cargando materiales...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Asistente de Devoluciones y Mermas</CardTitle>
                            <CardDescription>Gestiona el retorno de material de la OS {osId}</CardDescription>
                        </div>
                        {estadoCierre?.cerrada && (
                            <Badge variant="destructive" className="text-sm py-1 px-3">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                OS CERRADA - Solo lectura
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4">
                            {modules.map(m => (
                                <TabsTrigger key={m} value={m}>{m}</TabsTrigger>
                            ))}
                        </TabsList>

                        {modules.map(m => (
                            <TabsContent key={m} value={m} className="mt-4">
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Artículo</TableHead>
                                                <TableHead className="text-center">Pedido</TableHead>
                                                <TableHead className="text-center">Devuelto</TableHead>
                                                <TableHead className="text-center">Merma</TableHead>
                                                <TableHead className="text-center">Pendiente</TableHead>
                                                <TableHead className="w-[300px]">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredItems.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                        No hay artículos pedidos en este módulo.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredItems.map((item, idx) => {
                                                    const { devTotal, mermaTotal } = getTotals(item.itemCode);
                                                    const pendiente = item.quantity - devTotal - mermaTotal;
                                                    const currentInput = inputs[item.itemCode] || { dev: 0, merma: 0, obs: '' };

                                                    return (
                                                        <TableRow key={`${item.itemCode}-${idx}`}>
                                                            <TableCell>
                                                                <div className="font-medium">{item.description}</div>
                                                                <div className="text-xs text-muted-foreground">{item.itemCode}</div>
                                                            </TableCell>
                                                            <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                                                            <TableCell className="text-center text-green-600">{devTotal}</TableCell>
                                                            <TableCell className="text-center text-red-600">{mermaTotal}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant={pendiente === 0 ? "secondary" : "outline"}>
                                                                    {pendiente}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {!estadoCierre?.cerrada && pendiente > 0 ? (
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex gap-2">
                                                                            <div className="flex-1">
                                                                                <Label className="text-[10px] uppercase">Devolver</Label>
                                                                                <Input 
                                                                                    type="number" 
                                                                                    size={1}
                                                                                    value={currentInput.dev}
                                                                                    onChange={(e) => handleInputChange(item.itemCode, 'dev', parseInt(e.target.value) || 0)}
                                                                                    max={pendiente}
                                                                                    className="h-8"
                                                                                />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <Label className="text-[10px] uppercase">Merma</Label>
                                                                                <Input 
                                                                                    type="number" 
                                                                                    value={currentInput.merma}
                                                                                    onChange={(e) => handleInputChange(item.itemCode, 'merma', parseInt(e.target.value) || 0)}
                                                                                    max={pendiente}
                                                                                    className="h-8"
                                                                                />
                                                                            </div>
                                                                            <div className="flex items-end">
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    className="h-8"
                                                                                    onClick={() => handleSave(item.itemCode, item.quantity)}
                                                                                    disabled={isSaving || (currentInput.dev === 0 && currentInput.merma === 0)}
                                                                                >
                                                                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                        <Input 
                                                                            placeholder="Observaciones..." 
                                                                            value={currentInput.obs}
                                                                            onChange={(e) => handleInputChange(item.itemCode, 'obs', e.target.value)}
                                                                            className="h-7 text-xs"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-muted-foreground italic">
                                                                        {estadoCierre?.cerrada ? 'OS Cerrada' : 'Completado'}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
