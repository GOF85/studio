
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Factory, Truck, Users, Activity, UserCog } from 'lucide-react';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';

type PortalLink = {
    href: string;
    title: string;
    icon: React.ElementType;
    description: string;
    requiredRole: string;
}

const portalLinks: PortalLink[] = [
    {
        href: '/portal/partner',
        title: 'Portal de Partner de Producción',
        icon: Factory,
        description: 'Accede para ver los pedidos de producción de gastronomía que tienes asignados.',
        requiredRole: 'Partner Gastronomia'
    },
    {
        href: '/portal/personal',
        title: 'Portal de Partner de Personal',
        icon: Users,
        description: 'Consulta y gestiona los turnos de personal para los eventos de entrega.',
        requiredRole: 'Partner Personal'
    },
    {
        href: '/portal/transporte',
        title: 'Portal de Transporte',
        icon: Truck,
        description: 'Consulta tus rutas de entrega y gestiona los albaranes.',
        requiredRole: 'Transporte'
    },
    {
        href: '/portal/gestion-accesos',
        title: 'Gestión de Accesos',
        icon: UserCog,
        description: 'Crea y administra las cuentas de usuario para los portales externos.',
        requiredRole: 'Admin'
    },
    {
        href: '/portal/activity-log',
        title: 'Log de Actividad',
        icon: Activity,
        description: 'Revisa las acciones realizadas por los usuarios en los portales.',
        requiredRole: 'Admin'
    }
];


export default function PortalHomePage() {
  const { impersonatedUser } = useImpersonatedUser();

  const userRoles = impersonatedUser?.roles || [];
  const isAdmin = userRoles.includes('Admin') || userRoles.includes('Comercial');
  
  const accessibleLinks = isAdmin 
    ? portalLinks 
    : portalLinks.filter(link => userRoles.includes(link.requiredRole));

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        {impersonatedUser ? (
            <p className="text-lg text-muted-foreground mt-2">Selecciona tu portal para acceder a tus tareas asignadas.</p>
        ) : (
            <p className="text-lg text-muted-foreground mt-2">Por favor, selecciona un usuario en el menú superior para simular una sesión.</p>
        )}
      </div>

      {accessibleLinks.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {accessibleLinks.map(link => (
                 <Link href={link.href} key={link.href}>
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><link.icon /> {link.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{link.description}</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
      ) : impersonatedUser && (
        <div className="text-center text-muted-foreground">
            <p>El usuario seleccionado no tiene ningún rol con acceso a portales.</p>
        </div>
      )}
    </main>
  );
}
