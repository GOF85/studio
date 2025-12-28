'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, Settings, Package, Percent, BookOpen, ChevronRight, BarChart3, Truck, LifeBuoy, Factory, ListChecks, Users } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function EntregasDashboardPage() {
    return (
        <TooltipProvider>
            <main className="min-h-screen bg-background/30 pb-20">
                {/* Header Premium Sticky */}
                <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                        <div className="flex items-center">
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <Package className="h-5 w-5 text-amber-500" />
                            </div>
                        </div>
                        <div className="flex-1" />
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
                    <section className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Link href="/entregas/pes">
                                <Card className="bg-background/40 backdrop-blur-sm border-border/40 hover:border-amber-500/50 hover:shadow-lg transition-all h-full group">
                                    <CardHeader className="flex-row items-center gap-4 p-5">
                                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                            <ClipboardList className="w-6 h-6 flex-shrink-0" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase tracking-widest">Previsión de Entregas</CardTitle>
                                            <p className="text-muted-foreground text-[11px] font-medium mt-1">Consulta y busca todos los pedidos de entrega.</p>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>
                            <Link href="/entregas/calendario">
                                <Card className="bg-background/40 backdrop-blur-sm border-border/40 hover:border-amber-500/50 hover:shadow-lg transition-all h-full group">
                                    <CardHeader className="flex-row items-center gap-4 p-5">
                                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                            <Calendar className="w-6 h-6 flex-shrink-0" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase tracking-widest">Calendario de Entregas</CardTitle>
                                            <p className="text-muted-foreground text-[11px] font-medium mt-1">Visualiza las entregas en una vista mensual.</p>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>
                        </div>

                        <Separator className="bg-border/40" />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { href: '/cpr', icon: Factory, title: 'Producción CPR' },
                                { href: '/entregas/picking', icon: ListChecks, title: 'Picking Almacén' },
                                { href: '/entregas/gestion-transporte', icon: Truck, title: 'Transporte' },
                                { href: '/entregas/gestion-personal', icon: Users, title: 'Gestión de Personal' }
                            ].map((item) => (
                                <Link href={item.href} key={item.href}>
                                    <Card className="bg-background/40 backdrop-blur-sm border-border/40 hover:border-amber-500/50 hover:shadow-lg transition-all h-full group">
                                        <CardHeader className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-amber-500/5 text-amber-600 group-hover:bg-amber-500/10 transition-colors">
                                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                                </div>
                                                <CardTitle className="text-[11px] font-black uppercase tracking-widest leading-none">{item.title}</CardTitle>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>

                        <Separator className="bg-border/40" />

                        <Link href="/analitica/entregas">
                            <Card className="bg-background/40 backdrop-blur-sm border-border/40 hover:border-amber-500/50 hover:shadow-lg transition-all h-full group">
                                <CardHeader className="flex-row items-center gap-4 p-5">
                                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                        <BarChart3 className="w-6 h-6 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-black uppercase tracking-widest">Analítica de Entregas</CardTitle>
                                        <p className="text-muted-foreground text-[11px] font-medium mt-1">Analiza costes y márgenes de tus entregas.</p>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    </section>
                </div>
            </main>
        </TooltipProvider>
    );
}
