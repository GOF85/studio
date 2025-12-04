'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BookHeart, ChefHat, Component, Archive, Trash2, BookCheck, ComponentIcon, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Receta, Elaboracion } from '@/types';
import { subMonths, startOfToday, isBefore } from 'date-fns';

// Import React Query hooks
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';

type StatCardProps = {
    title: string;
    value: number;
    icon: React.ElementType;
    description: string;
    href: string;
    colorClass?: string;
}

function StatCard({ title, value, icon: Icon, description, href, colorClass }: StatCardProps) {
    const content = (
        <Card className={`hover:border-primary hover:shadow-lg transition-all h-full flex flex-col ${colorClass}`}>
            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-2">
                <div className="bg-primary/10 p-3 rounded-full">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-4xl font-bold">{value}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}



export default function BookDashboardPage() {
    // Load all data with React Query
    const { data: recetas = [], isLoading: loadingRecetas } = useRecetas();
    const { data: elaboraciones = [], isLoading: loadingElaboraciones } = useElaboraciones();

    // Simple query to count ingredientes
    const { data: ingredientesCount = 0, isLoading: loadingIngredientes } = useQuery({
        queryKey: ['ingredientesCount'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('ingredientes_internos')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;
            return count || 0;
        },
    });

    // Query to count ingredientes pending review (based on historialRevisiones)
    const { data: ingredientesPendingCount = 0, isLoading: loadingIngredientesPending } = useQuery({
        queryKey: ['ingredientesPendingCount'],
        queryFn: async () => {
            const sixMonthsAgo = subMonths(startOfToday(), 6);
            
            const { data, error } = await supabase
                .from('ingredientes_internos')
                .select('id, historial_revisiones');

            if (error) throw error;
            
            // Count ingredientes that need review (no revision history or last revision older than 6 months)
            const count = (data || []).filter(item => {
                const latestRevision = item.historial_revisiones?.[item.historial_revisiones.length - 1];
                return !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);
            }).length;
            
            return count;
        },
    });

    const isLoading = loadingRecetas || loadingElaboraciones || loadingIngredientes || loadingIngredientesPending;

    const stats = useMemo(() => {
        if (isLoading) {
            return {
                totalRecetas: 0,
                totalRecetasActivas: 0,
                totalRecetasArchivadas: 0,
                totalElaboraciones: 0,
                totalIngredientes: 0,
                elaboracionesHuerfanas: 0,
                recetasParaRevisarCount: 0,
                elaboracionesParaRevisarCount: 0,
                ingredientesPendingCount: 0,
            };
        }

        // --- Cálculos de Totales ---
        const totalRecetas = recetas.length;
        const totalRecetasActivas = recetas.filter(r => !r.isArchived).length;
        const totalRecetasArchivadas = totalRecetas - totalRecetasActivas;
        const recetasParaRevisarCount = recetas.filter(r => r.requiereRevision).length;
        const elaboracionesParaRevisarCount = elaboraciones.filter(e => e.requiereRevision).length;

        // --- Lógica para Elaboraciones Huérfanas ---
        const elaboracionesEnUso = new Set<string>();
        recetas.forEach(receta => {
            (receta.elaboraciones || []).forEach((elab: any) => {
                elaboracionesEnUso.add(elab.elaboracionId);
            });
        });
        const elaboracionesHuerfanas = elaboraciones.filter(elab => !elaboracionesEnUso.has(elab.id)).length;

        return {
            totalRecetas,
            totalRecetasActivas,
            totalRecetasArchivadas,
            totalElaboraciones: elaboraciones.length,
            totalIngredientes: ingredientesCount,
            elaboracionesHuerfanas,
            recetasParaRevisarCount,
            elaboracionesParaRevisarCount,
            ingredientesPendingCount,
        };
    }, [recetas, elaboraciones, ingredientesCount, ingredientesPendingCount, isLoading]);

    if (isLoading) {
        return <LoadingSkeleton title="Cargando Panel de Control del Book..." />;
    }

    return (
        <main>
            <div className="mb-10">
                <h2 className="text-2xl font-headline font-semibold tracking-tight">Totales del Book</h2>
                <p className="text-muted-foreground">Una visión general del contenido de tu base de datos gastronómica.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-12">
                <StatCard title="Total Recetas" value={stats.totalRecetas} icon={BookHeart} description="Número total de recetas en el sistema." href="/book/recetas?filter=all" />
                <StatCard title="Recetas Activas" value={stats.totalRecetasActivas} icon={BookHeart} description="Recetas visibles para comerciales." href="/book/recetas?filter=active" />
                <StatCard title="Recetas Archivadas" value={stats.totalRecetasArchivadas} icon={Archive} description="Recetas ocultas y fuera de uso." href="/book/recetas?filter=archived" />
                <StatCard title="Total Elaboraciones" value={stats.totalElaboraciones} icon={Component} description="Componentes y sub-recetas." href="/book/elaboraciones" />
                <StatCard title="Total Ingredientes" value={stats.totalIngredientes} icon={ChefHat} description="Materias primas vinculadas a ERP." href="/book/ingredientes" />
            </div>

            <Separator />

            <div className="my-10">
                <h2 className="text-2xl font-headline font-semibold tracking-tight">Mantenimiento y Calidad de Datos</h2>
                <p className="text-muted-foreground">Tareas pendientes para asegurar la integridad y precisión de los datos del book.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="Elaboraciones Huérfanas"
                    value={stats.elaboracionesHuerfanas}
                    icon={Trash2}
                    description="Elaboraciones que no se usan en ninguna receta. Candidatas a ser eliminadas."
                    href="/book/elaboraciones?huérfanas=true"
                    colorClass={stats.elaboracionesHuerfanas > 0 ? "bg-amber-50" : "bg-green-50"}
                />
                <StatCard
                    title="Recetas Pendientes de Revisión"
                    value={stats.recetasParaRevisarCount}
                    icon={BookCheck}
                    description="Recetas marcadas manualmente para su revisión por cambios o errores."
                    href="/book/revision-ingredientes"
                    colorClass={stats.recetasParaRevisarCount > 0 ? "bg-red-50" : "bg-green-50"}
                />
                <StatCard
                    title="Elaboraciones Pendientes de Revisión"
                    value={stats.elaboracionesParaRevisarCount}
                    icon={ComponentIcon}
                    description="Elaboraciones marcadas manualmente para su revisión."
                    href="/book/revision-ingredientes"
                    colorClass={stats.elaboracionesParaRevisarCount > 0 ? "bg-red-50" : "bg-green-50"}
                />
                <StatCard
                    title="Ingredientes Pendientes de Revisión"
                    value={stats.ingredientesPendingCount}
                    icon={AlertCircle}
                    description="Ingredientes con última actualización mayor a 6 meses."
                    href="/book/ingredientes?pending=true"
                    colorClass={stats.ingredientesPendingCount > 0 ? "bg-red-50" : "bg-green-50"}
                />
            </div>
        </main>
    );
}
