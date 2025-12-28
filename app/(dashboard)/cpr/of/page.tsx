'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCprOfLogic } from "@/hooks/use-cpr-of-logic";
import { OfHeader } from "@/components/cpr/of/OfHeader";
import { OfNeedsTable } from "@/components/cpr/of/OfNeedsTable";
import { OfListTable } from "@/components/cpr/of/OfListTable";
import { OfAssignmentTable } from "@/components/cpr/of/OfAssignmentTable";
import { OfDialogs } from "@/components/cpr/of/OfDialogs";
import { Loader2, ClipboardList, ShoppingCart, Calendar, CheckCircle2 } from "lucide-react";

export default function OrdenesFabricacionPage() {
    const logic = useCprOfLogic();
    const { isLoading, necesidades, necesidadesCubiertas, filteredAndSortedOFs, listaDeLaCompra } = logic;

    if (isLoading) {
        return (
            <div className="flex h-[450px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <OfHeader {...logic} />

            <Tabs defaultValue="planificacion" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
                    <TabsTrigger value="planificacion" className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Planificación
                    </TabsTrigger>
                    <TabsTrigger value="seguimiento" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Seguimiento
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="planificacion" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Necesidades Netas</CardTitle>
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{necesidades.length}</div>
                                <p className="text-xs text-muted-foreground">Elaboraciones pendientes de producir</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lista de la Compra</CardTitle>
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{listaDeLaCompra.length}</div>
                                <p className="text-xs text-muted-foreground">Proveedores con pedidos pendientes</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="necesidades" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="necesidades">Tabla Necesidades</TabsTrigger>
                            <TabsTrigger value="compra">Lista de la Compra</TabsTrigger>
                            <TabsTrigger value="cubiertas" className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Cubiertas
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="necesidades">
                            <OfNeedsTable {...logic} type="netas" />
                        </TabsContent>

                        <TabsContent value="compra">
                            <OfListTable {...logic} />
                        </TabsContent>

                        <TabsContent value="cubiertas">
                            <OfNeedsTable {...logic} type="cubiertas" />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="seguimiento" className="space-y-4">
                    <OfAssignmentTable {...logic} />
                </TabsContent>
            </Tabs>

            <OfDialogs {...logic} />
        </div>
    );
}




