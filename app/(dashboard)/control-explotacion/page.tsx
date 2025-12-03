
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AreaChart, Factory, ArrowRight } from 'lucide-react';

export default function ControlExplotacionPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
         <div className="mb-12">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Control de Explotación</h1>
            <p className="text-lg text-muted-foreground mt-2">Analiza la rentabilidad y el rendimiento de las diferentes unidades de negocio.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
            <Link href="/control-explotacion/cpr">
                <Card className="hover:border-primary hover:shadow-lg transition-all h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Factory />Control de Explotación CPR</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">Analiza los ingresos, gastos y rentabilidad del Centro de Producción.</p>
                    </CardContent>
                    <div className="p-4 pt-0 text-sm font-semibold text-primary flex items-center">
                        Acceder al informe <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                </Card>
            </Link>
        </div>
      </main>
    </div>
  );
}
