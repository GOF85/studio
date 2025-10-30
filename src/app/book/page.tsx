
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BookHeart, ChefHat, Component, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Receta, Elaboracion, IngredienteInterno } from '@/types';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

type StatCardProps = {
    title: string;
    value: number;
    icon: React.ElementType;
    bgColorClass: string;
    href?: string;
}

function StatCard({ title, value, icon: Icon, bgColorClass, href }: StatCardProps) {
    const router = useRouter();
    const content = (
         <Card className={`hover:shadow-lg transition-all ${href ? 'cursor-pointer' : ''} ${bgColorClass}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}

export default function BookDashboardPage() {
  const [stats, setStats] = useState({
    totalRecetas: 0,
    totalElaboraciones: 0,
    totalIngredientes: 0,
  });
  const [recetasParaRevisar, setRecetasParaRevisar] = useState<Receta[]>([]);
  const [elaboracionesParaRevisar, setElaboracionesParaRevisar] = useState<Elaboracion[]>([]);

  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const storedRecetas = (JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[]);
    const storedElaboraciones = (JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[]);
    const storedIngredientes = (JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[]);
    
    setStats({
      totalRecetas: storedRecetas.length,
      totalElaboraciones: storedElaboraciones.length,
      totalIngredientes: storedIngredientes.length,
    });

    setRecetasParaRevisar(storedRecetas.filter(r => r.requiereRevision));
    setElaboracionesParaRevisar(storedElaboraciones.filter(e => e.requiereRevision));
    
    setIsMounted(true);
  }, []);


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Panel de Control del Book..." />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 mb-8">
            <StatCard title="Total Recetas" value={stats.totalRecetas} icon={BookHeart} bgColorClass="bg-blue-50" href="/book/recetas" />
            <StatCard title="Total Elaboraciones" value={stats.totalElaboraciones} icon={Component} bgColorClass="bg-indigo-50" href="/book/elaboraciones"/>
            <StatCard title="Total Ingredientes" value={stats.totalIngredientes} icon={ChefHat} bgColorClass="bg-violet-50" href="/book/ingredientes" />
        </div>

        <Separator className="my-8"/>

        <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle/> Recetas para Revisar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Categoría</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recetasParaRevisar.length > 0 ? recetasParaRevisar.map(receta => (
                                    <TableRow key={receta.id} onClick={() => router.push(`/book/recetas/${receta.id}`)} className="cursor-pointer">
                                        <TableCell className="font-medium">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild><span className="hover:text-primary">{receta.nombre}</span></TooltipTrigger>
                                                    <TooltipContent side="right"><p className="max-w-sm">{receta.comentarioRevision || 'Sin comentario de revisión.'}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell>{receta.categoria}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={2} className="h-24 text-center">¡Buen trabajo! No hay recetas pendientes de revisión.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle/> Elaboraciones para Revisar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Partida</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {elaboracionesParaRevisar.length > 0 ? elaboracionesParaRevisar.map(elab => (
                                    <TableRow key={elab.id} onClick={() => router.push(`/book/elaboraciones/${elab.id}`)} className="cursor-pointer">
                                        <TableCell className="font-medium">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild><span className="hover:text-primary">{elab.nombre}</span></TooltipTrigger>
                                                    <TooltipContent side="right"><p className="max-w-sm">{elab.comentarioRevision || 'Sin comentario de revisión.'}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell>{elab.partidaProduccion}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={2} className="h-24 text-center">¡Perfecto! No hay elaboraciones que necesiten revisión.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
