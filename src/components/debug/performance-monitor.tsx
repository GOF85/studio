
'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

type PerfLog = {
    key: string;
    read: number;
    parse: number;
};

export function PerformanceMonitor() {
    const [log, setLog] = useState<PerfLog[] | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__PERF_LOG) {
            setLog((window as any).__PERF_LOG);
        }
    }, []);
    
    if (!log) return null;

    const totalRead = log.reduce((sum, item) => sum + item.read, 0);
    const totalParse = log.reduce((sum, item) => sum + item.parse, 0);
    const totalTime = totalRead + totalParse;
    
    if (!isOpen) {
        return (
            <div className="fixed bottom-2 right-2 z-50">
                <Button onClick={() => setIsOpen(true)} size="sm" variant="outline" className="bg-background shadow-lg">
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
                                <TableHead>Clave (localStorage)</TableHead>
                                <TableHead className="text-right">T. Lectura (ms)</TableHead>
                                <TableHead className="text-right">T. Parseo (ms)</TableHead>
                                <TableHead className="text-right">T. Total (ms)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {log.sort((a,b) => (b.read + b.parse) - (a.read + a.parse)).map(item => (
                                <TableRow key={item.key}>
                                    <TableCell className="font-mono text-xs">{item.key}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{item.read.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{item.parse.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold">{(item.read + item.parse).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
