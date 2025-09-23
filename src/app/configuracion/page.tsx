'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database, Target, FilePlus2, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const configItems = [
    { title: 'Bases de Datos', href: '/bd', icon: Database, description: 'Gestiona personal, espacios, proveedores, etc.' },
    { title: 'Objetivos de Gasto', href: '/objetivos-gasto', icon: Target, description: 'Crea y edita plantillas para el análisis de rentabilidad.' },
    { title: 'Plantillas de Pedidos', href: '/plantillas-pedidos', icon: FilePlus2, description: 'Agiliza la creación de pedidos de material.' },
];

export default function ConfiguracionPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
         <div className="mb-12">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Configuración del Sistema</h1>
            <p className="text-lg text-muted-foreground mt-2">Administra los datos maestros y las plantillas que potencian la aplicación.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configItems.map(item => (
                 <Link href={item.href} key={item.href}>
                    <Card className="h-full hover:border-primary hover:shadow-lg transition-all flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><item.icon />{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <p className="text-sm text-muted-foreground">{item.description}</p>
                        </CardContent>
                         <div className="p-4 pt-0 text-sm font-semibold text-primary flex items-center">
                            Gestionar <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                    </Card>
                 </Link>
            ))}
        </div>

        <div className="mt-12">
            <Card className="border-destructive bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-3"><Trash2 />Zona de Peligro</CardTitle>
                    <CardDescription className="text-destructive/80">
                        Acciones irreversibles como la eliminación de bases de datos. Procede con extrema precaución.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <Link href="/bd/borrar">
                        <Button variant="destructive">
                            Borrar Bases de Datos <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
