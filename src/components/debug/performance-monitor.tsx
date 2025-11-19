
'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

type PerfLog = {
    context: string;
    step: string;
    time: number;
};

export function PerformanceMonitor() {
    const [log, setLog] = useState<PerfLog[] | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof window !== 'undefined' && (window as any).__PERF_LOG) {
                setLog((window as any).__PERF_LOG);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);
    
    if (!log) return null;

    const totalTime = log.reduce((sum, item) => sum + item.time, 0);
    
    if (!isOpen) {
        return (
            <div className="fixed bottom-2 right-2 z-50">
                <Button onClick={() => setIsOpen(true)} size="sm" variant="destructive" className="shadow-lg">
                    Carga: {totalTime.toFixed(2)}ms
                </Button>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="w-full max-w-4xl bg-background rounded-lg shadow-2xl border max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">Monitor de Rendimiento de Carga</h2>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cerrar</Button>
                </div>
                 <div className="p-4 text-center border-b">
                    <p className="text-sm text-muted-foreground">Tiempo Total de Carga (localStorage)</p>
                    <p className="text-3xl font-bold">{totalTime.toFixed(2)}ms</p>
                </div>
                <div className="overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Contexto</TableHead>
                                <TableHead>Paso</TableHead>
                                <TableHead className="text-right">Tiempo (ms)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {log.map(item => (
                                <TableRow key={`${item.context}-${item.step}`}>
                                    <TableCell className="font-mono text-xs">{item.context}</TableCell>
                                    <TableCell className="font-mono text-xs">{item.step}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold">{item.time.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
