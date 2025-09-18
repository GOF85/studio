'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, FileText, PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  // Datos de ejemplo para notificaciones
  const notifications = [
    { id: 1, message: "El pedido de material para la OS-2024-001 ha cambiado a 'En preparación'.", time: "hace 5 minutos" },
    { id: 2, message: "Se ha creado una nueva Orden de Servicio: OS-2024-003.", time: "hace 1 hora" },
    { id: 3, message: "El briefing comercial para 'Boda J&M' ha sido actualizado.", time: "hace 3 horas" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Columna Izquierda: Centro de Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Bell />
                Centro de Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <ul className="space-y-4">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="flex flex-col pb-2 border-b last:border-0">
                      <p className="font-medium">{notification.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">{notification.time}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-muted-foreground py-10">
                  <p>No tienes notificaciones nuevas.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Columna Derecha: Acciones Rápidas */}
          <div className="space-y-8">
            <Card className="bg-primary/10 border-primary">
               <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <FileText />
                    Gestión de Servicios
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center text-center p-10">
                <p className="text-lg mb-4">Crea y gestiona todas tus órdenes de servicio desde un único lugar.</p>
                <Button asChild size="lg">
                    <Link href="/os">
                        <PlusCircle className="mr-2" />
                        Nueva Orden de Servicio
                    </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <footer className="py-4 border-t mt-auto">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CateringStock. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
