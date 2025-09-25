

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { useState, useEffect, useMemo } from 'react';
import type { OrdenFabricacion, Elaboracion, ServiceOrder, GastronomyOrder, Receta, ExcedenteProduccion } from '@/types';
import { addDays, differenceInDays } from 'date-fns';


const cprNav = [
    { title: 'Planificación', href: '/cpr/planificacion', icon: ClipboardList, description: 'Agrega necesidades y genera O.F.' },
    { title: 'Órdenes de Fabricación', href: '/cpr/of', icon: Factory, description: 'Gestiona la producción en cocina.' },
    { title: 'Picking y Logística', href: '/cpr/picking', icon: Package, description: 'Prepara los pedidos para eventos.' },
    { title: 'Excedentes', href: '/cpr/excedentes', icon: PackagePlus, description: 'Gestiona el sobrante de producción.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Informe de Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History, description: 'Consulta lotes y su histórico.' },
    { title: 'Informe de Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción.' },
];

export default function CprLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [hasPendingExcedentes, setHasPendingExcedentes] = useState(false);

    useEffect(() => {
        // This logic is a simplified version of the one in excedentes/page.tsx
        // It's intended to provide a quick check for the badge without duplicating all the complex business logic.
        const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
        const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        const allOrdenesFabricacion = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const allExcedentesData = JSON.parse(localStorage.getItem('excedentesProduccion') || '{}') as {[key: string]: ExcedenteProduccion};

        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
        const elaboracionesMap = new Map(allElaboraciones.map(e => [e.id, e]));

        const necesidadesPorElaboracion = new Map<string, { necesidadBruta: number; produccionAcumulada: number; }>();

        allGastroOrders.forEach(gastroOrder => {
            (gastroOrder.items || []).forEach(item => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        receta.elaboraciones.forEach(elabEnReceta => {
                            const elaboracion = elaboracionesMap.get(elabEnReceta.elaboracionId);
                            if (elaboracion) {
                                const cantidadNecesaria = Number(item.quantity || 0) * Number(elabEnReceta.cantidad);
                                let registro = necesidadesPorElaboracion.get(elaboracion.id);
                                if (!registro) {
                                    registro = { necesidadBruta: 0, produccionAcumulada: 0 };
                                    necesidadesPorElaboracion.set(elaboracion.id, registro);
                                }
                                registro.necesidadBruta += cantidadNecesaria;
                            }
                        });
                    }
                }
            });
        });

        allOrdenesFabricacion.forEach(of => {
            const cantidadProducida = (of.estado === 'Finalizado' || of.estado === 'Validado' || of.estado === 'Incidencia') && of.cantidadReal !== null ? Number(of.cantidadReal) : Number(of.cantidadTotal);
            let registro = necesidadesPorElaboracion.get(of.elaboracionId);
            if (!registro) {
                const elab = elaboracionesMap.get(of.elaboracionId);
                if (elab) {
                    registro = { necesidadBruta: 0, produccionAcumulada: 0 };
                    necesidadesPorElaboracion.set(of.elaboracionId, registro);
                }
            }
            if (registro && !isNaN(cantidadProducida)) {
                registro.produccionAcumulada += cantidadProducida;
            }
        });

        let hasPending = false;
        necesidadesPorElaboracion.forEach((registro, elabId) => {
            const diferencia = registro.produccionAcumulada - registro.necesidadBruta;
            if (diferencia > 0.001) {
                const ofsParaElab = allOrdenesFabricacion.filter(of => of.elaboracionId === elabId);
                const ofReferencia = ofsParaElab.length > 0 ? ofsParaElab[0] : null;
                const excedenteData = allExcedentesData[ofReferencia?.id || ''];
                const diasCaducidad = excedenteData?.diasCaducidad;
                 if (diasCaducidad === undefined) {
                    const fechaProduccion = ofReferencia?.fechaFinalizacion || ofReferencia?.fechaCreacion;
                    if (fechaProduccion && differenceInDays(new Date(), new Date(fechaProduccion)) > 3) {
                       hasPending = true;
                    }
                 } else {
                    const fechaProduccion = ofReferencia?.fechaFinalizacion || ofReferencia?.fechaCreacion;
                    if (fechaProduccion) {
                        const fechaCad = addDays(new Date(fechaProduccion), diasCaducidad);
                        if (new Date() > fechaCad) {
                            hasPending = true;
                        }
                    }
                 }
            }
        });
        setHasPendingExcedentes(hasPending);

    }, [pathname]);

    return (
        <>
        <Header />
        <div className="container mx-auto">
            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
                <aside className="lg:sticky top-20 self-start h-[calc(100vh-5rem)] hidden lg:block">
                     <div className="w-full">
                        <div className="pb-4">
                            <h2 className="text-xl font-headline font-bold flex items-center gap-3"><Factory size={24}/>Panel de Producción</h2>
                            <p className="text-sm text-muted-foreground">
                                Gestión de Cocina y Logística
                            </p>
                        </div>
                        <nav className="grid items-start gap-1">
                            {cprNav.map((item, index) => {
                                const isExcedentes = item.title === 'Excedentes';
                                const needsHighlight = isExcedentes && hasPendingExcedentes;

                                return (
                                <Link
                                    key={index}
                                    href={item.href}
                                >
                                    <span
                                        className={cn(
                                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                            pathname.startsWith(item.href) ? "bg-accent" : "transparent"
                                        )}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.title}</span>
                                        {needsHighlight && <span className="ml-auto h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>}
                                    </span>
                                </Link>
                            )})}
                        </nav>
                    </div>
                </aside>
                <main className="py-8">
                    {children}
                </main>
            </div>
        </div>
        </>
    );
}
