
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { rrhhNav } from '@/lib/rrhh-nav';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { useMemo } from 'react';

export default function RrhhDashboardPage() {
    const { impersonatedUser } = useImpersonatedUser();
    
    const visibleNav = useMemo(() => {
        if (!impersonatedUser) return [];
        const isAdmin = impersonatedUser.roles.includes('Admin');
        return rrhhNav.filter(item => (!item.adminOnly || isAdmin) && item.href !== '/rrhh');
    }, [impersonatedUser]);

  return (
    <main>
        <div className="mb-12">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Recursos Humanos</h1>
            <p className="text-lg text-muted-foreground mt-2">Gestiona las necesidades de personal, las bases de datos de trabajadores y analiza la productividad.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleNav.map(item => (
                <Link href={item.href} key={item.href}>
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><item.icon />{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <p className="text-sm text-muted-foreground">{item.description}</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </main>
  );
}
