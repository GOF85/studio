
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Factory, Truck, Users, Activity, UserCog } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

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
        href: '/rrhh/usuarios',
        title: 'Gestión de Usuarios (RRHH)',
        icon: UserCog,
        description: 'Gestiona el personal y los usuarios de los portales externos.',
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
    const { user, profile, effectiveRole, hasRole } = useAuth();

    // Map our new roles to the old string roles expected by the links for compatibility
    // Or better, update the links to use the new UserRole type.
    // For now, I'll map the logic.

    const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'COMERCIAL'; // Commercial also had admin access in old code? "isAdmin = ... || userRoles.includes('Comercial')"

    // Helper to check if link is accessible
    const isLinkAccessible = (requiredRole: string) => {
        if (isAdmin) return true;
        // Map old roles to new roles
        // 'Partner Gastronomia' -> 'PARTNER_GASTRONOMIA'
        // 'Partner Personal' -> 'PARTNER_PERSONAL'
        // 'Transporte' -> 'PARTNER_TRANSPORTE'
        // 'Admin' -> 'ADMIN'

        const roleMap: { [key: string]: string } = {
            'Partner Gastronomia': 'PARTNER_GASTRONOMIA',
            'Partner Personal': 'PARTNER_PERSONAL',
            'Transporte': 'PARTNER_TRANSPORTE',
            'Admin': 'ADMIN'
        };

        const mappedRole = roleMap[requiredRole];
        return mappedRole ? hasRole(mappedRole as any) : false;
    };

    const accessibleLinks = portalLinks.filter(link => isLinkAccessible(link.requiredRole));

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="text-center mb-12">
                {user ? (
                    <p className="text-lg text-muted-foreground mt-2">Selecciona tu portal para acceder a tus tareas asignadas.</p>
                ) : (
                    <p className="text-lg text-muted-foreground mt-2">Por favor, inicia sesión para continuar.</p>
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
            ) : user && (
                <div className="text-center text-muted-foreground">
                    <p>No tienes ningún rol con acceso a portales asignado.</p>
                </div>
            )}
        </main>
    );
}
