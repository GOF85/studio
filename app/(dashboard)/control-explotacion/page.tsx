
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AreaChart, Factory, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ControlExplotacionPage() {
  return (
    <main className="min-h-screen bg-background/30 pb-20">
        {/* Header Premium Sticky */}
        <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                <div className="flex items-center">
                    <div className="p-2 rounded-xl bg-slate-500/10 border border-slate-500/20">
                        <AreaChart className="h-5 w-5 text-slate-500" />
                    </div>
                </div>
                <div className="flex-1" />
            </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
            <Link href="/control-explotacion/cpr">
                <Card className="bg-background/40 backdrop-blur-sm border-border/40 hover:border-slate-500/50 hover:shadow-lg transition-all h-full flex flex-col group">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest group-hover:text-slate-600 transition-colors">
                            <Factory className="h-5 w-5" />
                            Control de Explotación CPR
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-xs text-muted-foreground font-medium">Analiza los ingresos, gastos y rentabilidad del Centro de Producción.</p>
                    </CardContent>
                    <div className="p-4 pt-0 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                        Acceder al informe <ArrowRight className="ml-2 h-3 w-3" />
                    </div>
                </Card>
            </Link>
        </div>
    </main>
  );
}
