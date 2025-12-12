'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useEscandalloAnalytics } from '@/hooks/use-escandallo-analytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AnalisisEconomicoCard() {
    const today = new Date();
    const fromDate = format(subDays(today, 30), 'yyyy-MM-dd');
    const toDate = format(today, 'yyyy-MM-dd');

    const { data, isLoading } = useEscandalloAnalytics('recetas', fromDate, toDate);

    const recetasAfectadas = data.length;
    
    const variacionPromedio = useMemo(() => {
        if (!data.length) return 0;
        const totalPercent = data.reduce((acc, curr) => acc + curr.percent, 0);
        return totalPercent / data.length;
    }, [data]);

    const isCostUp = variacionPromedio > 0;
    const isCostDown = variacionPromedio < 0;

    return (
        <Link href="/book/analitica/diferencias-escandallo" className="block h-full">
            <Card className="h-full border-emerald-200/60 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col bg-emerald-50/10">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BarChart3 className="w-24 h-24 text-emerald-500" />
                </div>

                <CardHeader className="p-5 pb-2 relative z-10">
                    <CardTitle className="text-base font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Análisis de Costes
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-5 pt-0 relative z-10 flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div className="bg-white/60 rounded-lg py-3 px-4 border border-emerald-100 shadow-sm flex flex-col items-center text-center justify-center">
                            {isLoading ? (
                                <div className="h-8 w-12 bg-muted/20 animate-pulse rounded mb-1" />
                            ) : (
                                <span className="text-3xl font-extrabold text-foreground leading-none mb-1">{recetasAfectadas}</span>
                            )}
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide leading-tight">Recetas Afectadas</span>
                            <span className="text-[9px] text-emerald-600 font-medium leading-tight mt-0.5">Últimos 30 días</span>
                        </div>

                        <div className="bg-white/60 rounded-lg py-3 px-4 border border-emerald-100 shadow-sm flex flex-col items-center text-center justify-center">
                            {isLoading ? (
                                <div className="h-8 w-16 bg-muted/20 animate-pulse rounded mb-1" />
                            ) : (
                                <div className={cn("flex items-center gap-1 text-2xl font-extrabold leading-none mb-1", 
                                    isCostUp ? "text-rose-600" : isCostDown ? "text-emerald-600" : "text-muted-foreground"
                                )}>
                                    {isCostUp && <ArrowUpRight className="w-5 h-5" />}
                                    {isCostDown && <ArrowDownRight className="w-5 h-5" />}
                                    {!isCostUp && !isCostDown && <Minus className="w-4 h-4" />}
                                    {Math.abs(variacionPromedio).toFixed(2)}%
                                </div>
                            )}
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide leading-tight">Variación Media</span>
                            <span className={cn("text-[9px] font-medium leading-tight mt-0.5", isCostUp ? "text-rose-600" : isCostDown ? "text-emerald-600" : "text-muted-foreground")}>
                                {isCostUp ? "Coste Alza" : isCostDown ? "Ahorro" : "Estable"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
