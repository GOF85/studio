'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { BookHeart, ChefHat, Component, Shield, Archive, Trash2, BookCheck, ComponentIcon } from 'lucide-react';
import { useMemo } from 'react';
import { isBefore, subMonths, startOfToday, isWithinInterval, addYears } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Receta, Elaboracion, IngredienteInterno } from '@/types';

// Import React Query hooks
import { useRecetas, useElaboraciones, useEventos, useGastronomyOrders } from '@/hooks/use-data-queries';

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

// Hook for ingredientes internos
function useIngredientesInternos() {
    return useQuery({
        queryKey: ['ingredientesInternos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ingredientes_internos')
                .select('*');

            if (error) throw error;

            return (data || []).map((row: any): IngredienteInterno => ({
                id: row.id,
                nombreIngrediente: row.nombre_ingrediente,
                productoERPlinkId: row.producto_erp_link_id,
                alergenosPresentes: row.alergenos_presentes || [],
                alergenosTrazas: row.alergenos_trazas || [],
                historialRevisiones: row.historial_revisiones || [],
            }));
        },
    });
}

export default function BookDashboardPage() {
    // Load all data with React Query
    const { data: recetas = [], isLoading: loadingRecetas } = useRecetas();
    const { data: elaboraciones = [], isLoading: loadingElaboraciones } = useElaboraciones();
    const { data: ingredientes = [], isLoading: loadingIngredientes } = useIngredientesInternos();
    const { data: serviceOrders = [], isLoading: loadingEventos } = useEventos();
    const { data: gastroOrders = [], isLoading: loadingGastro } = useGastronomyOrders();

    const isLoading = loadingRecetas || loadingElaboraciones || loadingIngredientes || loadingEventos || loadingGastro;

    const stats = useMemo(() => {
        if (isLoading) {
            return {
                totalRecetas: 0,
                totalRecetasActivas: 0,
                totalRecetasArchivadas: 0,
                totalElaboraciones: 0,
                totalIngredientes: 0,
                elaboracionesHuerfanas: 0,
                ingredientesPorVerificarCount: 0,
                recetasParaRevisarCount: 0,
                elaboracionesParaRevisarCount: 0,
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
            (receta.elaboraciones || []).forEach(elab => {
                elaboracionesEnUso.add(elab.elaboracionId);
            });
        });
        const elaboracionesHuerfanas = elaboraciones.filter(elab => !elaboracionesEnUso.has(elab.id)).length;

        // --- Lógica para Ingredientes por Verificar ---
        const confirmedOrders = serviceOrders.filter(os => os.status === 'Confirmado');

        const today = startOfToday();
        const sixMonthsAgo = subMonths(today, 6);

        const recetasEnUsoIds = new Set<string>();
        confirmedOrders.forEach(os => {
            const osDate = new Date(os.startDate);
            if (isWithinInterval(osDate, { start: today, end: addYears(today, 1) })) {
                gastroOrders
                    .filter(go => go.osId === os.id)
                    .forEach(pedido => {
                        (pedido.items || []).forEach(item => {
                            if (item.type === 'item') recetasEnUsoIds.add(item.id);
                        });
                    });
            }
        });

        const elaboracionesEnUsoIds = new Set<string>();
        recetas.forEach(receta => {
            if (recetasEnUsoIds.has(receta.id)) {
                (receta.elaboraciones || []).forEach(elab => elaboracionesEnUsoIds.add(elab.elaboracionId));
            }
        });

        const ingredientesEnUsoIds = new Set<string>();
        elaboraciones.forEach(elab => {
            if (elaboracionesEnUsoIds.has(elab.id)) {
                (elab.componentes || []).forEach(comp => {
                    if (comp.tipo === 'ingrediente') ingredientesEnUsoIds.add(comp.componenteId);
                });
            }
        });

        const ingredientesPorVerificar = ingredientes.filter(ing => {
            const latestRevision = ing.historialRevisiones?.[ing.historialRevisiones.length - 1];
            const necesitaRevision = !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);
            const estaEnUso = ingredientesEnUsoIds.has(ing.id);
            return necesitaRevision && estaEnUso;
        });

        return {
            totalRecetas,
            totalRecetasActivas,
            totalRecetasArchivadas,
            totalElaboraciones: elaboraciones.length,
            totalIngredientes: ingredientes.length,
            elaboracionesHuerfanas,
            ingredientesPorVerificarCount: ingredientesPorVerificar.length,
            recetasParaRevisarCount,
            elaboracionesParaRevisarCount,
        };
    }, [recetas, elaboraciones, ingredientes, serviceOrders, gastroOrders, isLoading]);



    return (
        <main>
            <div className="mb-10">
                <h2 className="text-2xl font-headline font-semibold tracking-tight">Totales del Book</h2>
                <p className="text-muted-foreground">Una visión general del contenido de tu base de datos gastronómica.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-12">
                <StatCard title="Total Recetas" value={stats.totalRecetas} icon={BookHeart} description="Número total de recetas en el sistema." href="/book/recetas" />
                <StatCard title="Recetas Activas" value={stats.totalRecetasActivas} icon={BookHeart} description="Recetas visibles para comerciales." href="/book/recetas" />
                <StatCard title="Recetas Archivadas" value={stats.totalRecetasArchivadas} icon={Archive} description="Recetas ocultas y fuera de uso." href="/book/recetas" />
                <StatCard title="Total Elaboraciones" value={stats.totalElaboraciones} icon={Component} description="Componentes y sub-recetas." href="/book/elaboraciones" />
                <StatCard title="Total Ingredientes" value={stats.totalIngredientes} icon={ChefHat} description="Materias primas vinculadas a ERP." href="/book/ingredientes" />
            </div>

            <Separator />

            <div className="my-10">
                <h2 className="text-2xl font-headline font-semibold tracking-tight">Mantenimiento y Calidad de Datos</h2>
                <p className="text-muted-foreground">Tareas pendientes para asegurar la integridad y precisión de los datos del book.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Elaboraciones Huérfanas"
                    value={stats.elaboracionesHuerfanas}
                    icon={Trash2}
                    description="Elaboraciones que no se usan en ninguna receta. Candidatas a ser eliminadas."
                    href="/book/elaboraciones?huérfanas=true"
                    colorClass={stats.elaboracionesHuerfanas > 0 ? "bg-amber-50" : "bg-green-50"}
                />
                <StatCard
                    title="Ingredientes por Verificar"
                    value={stats.ingredientesPorVerificarCount}
                    icon={Shield}
                    description="Ingredientes en uso cuya información de alérgenos/ERP necesita ser validada."
                    href="/book/verificacionIngredientes"
                    colorClass={stats.ingredientesPorVerificarCount > 0 ? "bg-amber-50" : "bg-green-50"}
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
            </div>
        </main>
    );
}
