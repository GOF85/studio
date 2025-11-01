
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SolicitudesPersonalPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Solicitudes de Personal</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Esta página mostrará un listado de todas las necesidades de personal (interno y externo) para los eventos de catering y las entregas, agrupadas por Orden de Servicio.</p>
                <p className="mt-4 text-sm text-muted-foreground">Implementación pendiente.</p>
            </CardContent>
        </Card>
    )
}
