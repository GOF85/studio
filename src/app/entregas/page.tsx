
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, Settings, Package, Percent, BookOpen, ChevronRight } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function EntregasDashboardPage() {
  return (
    <TooltipProvider>
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Dashboard de Entregas MICE</h1>
        </div>

        <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Link href="/entregas/pes">
                    <Card className="hover:border-primary/80 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <ClipboardList className="w-10 h-10 text-primary flex-shrink-0" />
                            <div>
                                <CardTitle className="text-2xl">Previsión de Entregas</CardTitle>
                                <p className="text-muted-foreground text-sm mt-1">Consulta y busca todos los pedidos de entrega.</p>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/entregas/calendario">
                    <Card className="hover:border-primary/80 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <Calendar className="w-10 h-10 text-primary flex-shrink-0" />
                            <div>
                                <CardTitle className="text-2xl">Calendario de Entregas</CardTitle>
                                <p className="text-muted-foreground text-sm mt-1">Visualiza las entregas en una vista mensual.</p>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </section>
        
        <section>
             <h2 className="text-2xl font-headline font-semibold tracking-tight mb-4 text-center">Configuración de Entregas</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card className="flex flex-col hover:border-primary/50 hover:shadow-lg transition-all">
                    <CardHeader className="flex-row items-start gap-4 space-y-0 pb-3">
                        <Settings className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                        <div>
                            <Tooltip>
                                <TooltipTrigger asChild><CardTitle>Configuración</TooltipTrigger></TooltipTrigger>
                                <TooltipContent><p>Bases de datos y manuales específicos para la vertical de Entregas.</p></TooltipContent>
                            </Tooltip>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow pt-0">
                        <div className="border-t pt-2 mt-2">
                           <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground">
                                <Link href="/packs-de-venta"><Package className="w-4 h-4 mr-2" />Packs de Venta<ChevronRight className="w-4 h-4 ml-auto" /></Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground">
                                <Link href="/margenes-categoria"><Percent className="w-4 h-4 mr-2" />Márgenes por Categoría<ChevronRight className="w-4 h-4 ml-auto" /></Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground">
                                <Link href="/docs/entregas-manual"><BookOpen className="w-4 h-4 mr-2" />Manual de Entregas<ChevronRight className="w-4 h-4 ml-auto" /></Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
             </div>
        </section>
      </main>
    </TooltipProvider>
  );
}
