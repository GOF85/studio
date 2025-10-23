

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const KEYS_TO_INSPECT = [
    'materialOrders', 'pickingSheets', 'returnSheets', 'serviceOrders', 'entregas', 'comercialBriefings', 
    'gastronomyOrders', 'transporteOrders', 'hieloOrders', 'decoracionOrders', 'atipicoOrders', 
    'personalMiceOrders', 'personalExternoOrders', 'pruebasMenu', 'ordenesFabricacion', 
    'pickingStates', 'excedentesProduccion', 'pedidosEntrega', 'personalEntrega', 'partnerPedidosStatus', 
    'activityLogs', 'ctaRealCosts', 'ctaComentarios'
];

export default function InspectorPage() {
    const [data, setData] = useState<Record<string, any>>({});
    const [isMounted, setIsMounted] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsMounted(true);
        try {
            const allData: Record<string, any> = {};
            KEYS_TO_INSPECT.forEach(key => {
                const storedData = localStorage.getItem(key);
                if (storedData) {
                    try {
                        allData[key] = JSON.parse(storedData);
                    } catch (e) {
                        allData[key] = "Error al parsear JSON";
                    }
                } else {
                    allData[key] = null;
                }
            });
            setData(allData);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error al leer los datos',
                description: 'No se pudo leer la información desde localStorage.',
            });
        }
    }, [toast]);

    if (!isMounted) {
        return (
             <main className="container mx-auto px-4 py-8">
                 <h1 className="text-3xl font-bold">Cargando...</h1>
            </main>
        )
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Button variant="ghost" size="sm" asChild className="mb-2">
                        <Link href="/bd/borrar"><ArrowLeft className="mr-2" />Volver a Administración</Link>
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Search className="h-8 w-8 text-primary" />
                        Inspección de Datos
                    </h1>
                </div>
            </div>

            <Accordion type="multiple" className="w-full space-y-4">
                {KEYS_TO_INSPECT.map(key => (
                    <AccordionItem value={key} key={key} className="border rounded-lg">
                         <AccordionTrigger className="p-4 hover:no-underline">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">{key}</h3>
                                <span className="text-sm text-muted-foreground">({Array.isArray(data[key]) ? `${data[key].length} registros` : data[key] ? 'Objeto' : 'Vacío'})</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="p-4 border-t max-h-[60vh] overflow-y-auto bg-muted/20">
                                {data[key] ? (
                                    <pre className="text-xs whitespace-pre-wrap">
                                        {JSON.stringify(data[key], null, 2)}
                                    </pre>
                                ) : (
                                    <p className="text-muted-foreground">No hay datos para esta clave.</p>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </main>
    );
}
