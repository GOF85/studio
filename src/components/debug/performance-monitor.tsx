
'use client';

import { useState } from 'react';
import { useDataStore } from '@/hooks/use-data-store';
import { Button } from '../ui/button';
import { BarChart3, X, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

export function PerformanceMonitor() {
    const { performance } = useDataStore();
    const [isOpen, setIsOpen] = useState(true);

    if (performance.totalLoadTime === 0 || !isOpen) {
        return (
             <Button
                variant="outline"
                size="sm"
                className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm"
                onClick={() => setIsOpen(true)}
            >
                <Zap className="mr-2" />
                Perf
            </Button>
        );
    }
    
    return (
        <Card className="fixed bottom-4 right-4 z-50 w-80 bg-background/80 backdrop-blur-sm">
            <CardHeader className="flex-row items-center justify-between p-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 size={16}/> Performance</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}><X size={16}/></Button>
            </CardHeader>
            <CardContent className="p-2 pt-0">
                <div className="text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                        <span>Total Load Time:</span>
                        <span>{(performance.totalLoadTime / 1000).toFixed(2)}s</span>
                    </div>
                     <p className="text-muted-foreground pt-2">Slowest Items (localStorage parse):</p>
                     <ScrollArea className="h-40">
                        <ul className="text-xs">
                        {performance.individualParseTimes.slice(0, 10).map(({ key, time }) => (
                            <li key={key} className="flex justify-between">
                                <span>{key}</span>
                                <span>{time.toFixed(2)}ms</span>
                            </li>
                        ))}
                        </ul>
                     </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}

