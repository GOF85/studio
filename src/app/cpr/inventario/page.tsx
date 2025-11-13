
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';

export default function InventarioPage() {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <Archive />
                    Inventario de Materia Prima (CPR)
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Módulo en Construcción</CardTitle>
                    <CardDescription>
                        Esta sección permitirá la gestión del stock teórico, la realización de inventarios físicos y el análisis de desviaciones.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        La lógica y la estructura de datos para esta funcionalidad ya han sido definidas. La implementación de la interfaz de usuario está pendiente.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
