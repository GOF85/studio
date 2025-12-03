
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ArrowRight, Users, UserPlus } from 'lucide-react';

export default function AnaliticaRrhhPage() {
    return (
        <main>
            <div className="mb-12">
                <h1 className="text-4xl font-headline font-bold tracking-tight">Analítica de RRHH</h1>
                <p className="text-lg text-muted-foreground mt-2">Selecciona el tipo de personal que deseas analizar.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
                <Link href="/rrhh/analitica/externos">
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><UserPlus />Personal Externo (ETTs)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <p className="text-sm text-muted-foreground">Analiza costes, horas y rendimiento del personal proporcionado por Empresas de Trabajo Temporal.</p>
                        </CardContent>
                         <div className="p-4 pt-0 text-sm font-semibold text-primary flex items-center">
                            Ver análisis <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                    </Card>
                </Link>
                 <Card className="bg-muted/50 border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-muted-foreground"><Users />Personal Interno</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Próximamente: Analiza la productividad y costes del personal de MICE Catering.</p>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
