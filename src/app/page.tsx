'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Calendar, BookHeart, Factory, LifeBuoy, Settings } from 'lucide-react';

const menuItems = [
    { title: 'Previsión de Servicios', href: '/pes', icon: ClipboardList, description: 'Gestiona órdenes de servicio, clientes y eventos.' },
    { title: 'Calendario', href: '/calendario', icon: Calendar, description: 'Visualiza todos tus servicios en una vista mensual.' },
    { title: 'Book Gastronómico', href: '/book', icon: BookHeart, description: 'Define recetas, elaboraciones e ingredientes.' },
    { title: 'Producción (CPR)', href: '/cpr', icon: Factory, description: 'Planifica, produce y controla la logística de cocina.' },
    { title: 'Documentación', href: '/docs', icon: LifeBuoy, description: 'Guías y manuales de uso de la aplicación.' },
    { title: 'Configuración', href: '/configuracion', icon: Settings, description: 'Administra las bases de datos y plantillas del sistema.' },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Bienvenido a CateringStock</h1>
            <p className="text-lg text-muted-foreground mt-2">Gestiona tu operativa de catering de forma centralizada.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
                 <Link href={item.href} key={item.href}>
                    <Card className="h-full hover:border-primary hover:shadow-lg transition-all flex flex-col">
                        <CardHeader className="flex-row items-center gap-4 space-y-0">
                            <item.icon className="w-8 h-8 text-primary" />
                             <CardTitle>{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <p className="text-sm text-muted-foreground">{item.description}</p>
                        </CardContent>
                    </Card>
                 </Link>
            ))}
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
