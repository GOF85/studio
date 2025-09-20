'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookHeart, ChefHat, Component, PlusCircle, Search, Settings, Package } from 'lucide-react';
import type { Receta } from '@/types';
import { Input } from '@/components/ui/input';

export default function BookDashboardPage() {
  const [recentRecipes, setRecentRecipes] = useState<Receta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Datos de ejemplo para recetas
    const dummyRecipes: Receta[] = [
      // { id: '1', nombre: 'Lasaña de Carne a la Boloñesa', categoria: 'Principal', responsableEscandallo: 'Chef Ana', updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      // { id: '2', nombre: 'Merluza en Salsa Verde', categoria: 'Pescados', responsableEscandallo: 'Chef Juan', updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      // { id: '3', nombre: 'Tarta de Queso Cremosa', categoria: 'Postres', responsableEscandallo: 'Chef Maria', updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    ];
    // setRecentRecipes(dummyRecipes.sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
    setIsMounted(true);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
            <h1 className="text-4xl font-headline font-bold text-gray-800 flex items-center gap-3"><BookHeart size={36}/>Book Gastronómico</h1>
            <p className="text-lg text-muted-foreground mt-1">Gestiona el corazón de tu cocina: recetas, costes y escandallos.</p>
        </div>

        <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Buscar recetas, elaboraciones o ingredientes..."
                className="w-full pl-10 h-12 text-lg border rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PlusCircle /> Nueva Receta</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Crea un plato desde cero, combinando elaboraciones e ingredientes.</p>
                    <Button asChild className="w-full">
                        <Link href="/book/recetas/nueva">Empezar a Crear</Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Component />Gestionar Elaboraciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Edita tus sub-recetas, los bloques de construcción de tus platos.</p>
                     <Button asChild className="w-full" variant="outline">
                        <Link href="/book/elaboraciones">Ver Todas</Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ChefHat />Gestionar Ingredientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Vincula tu materia prima con el ERP y gestiona los alérgenos.</p>
                     <Button asChild className="w-full" variant="outline">
                        <Link href="/book/ingredientes">Ir a Ingredientes</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h2 className="text-2xl font-headline font-semibold mb-4">Últimas Recetas Modificadas</h2>
                <Card>
                    <CardContent className="pt-6">
                    {recentRecipes.length > 0 ? (
                        <ul className="space-y-4">
                        {recentRecipes.map((recipe) => (
                            <li key={recipe.id} className="flex items-center justify-between pb-2 border-b last:border-0">
                            <div>
                                <Link href={`/book/recetas/${recipe.id}`} className="font-semibold text-primary hover:underline">{recipe.nombre}</Link>
                                <p className="text-sm text-muted-foreground">
                                    {recipe.categoria} - Modificado por {recipe.responsableEscandallo}
                                    {/* - {formatDistanceToNow(recipe.updatedAt, { addSuffix: true, locale: es })} */}
                                </p>
                            </div>
                            <Button asChild variant="secondary" size="sm">
                                <Link href={`/book/recetas/${recipe.id}`}>Editar</Link>
                            </Button>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                        <p>Aún no se ha creado ninguna receta.</p>
                        <p className="text-sm">¡Crea tu primera receta para verla aquí!</p>
                        </div>
                    )}
                    </CardContent>
                </Card>
            </div>
            <div>
                <h2 className="text-2xl font-headline font-semibold mb-4">Bases de Datos</h2>
                 <div className="space-y-4">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold flex items-center gap-2"><Package />Materia Prima (ERP)</h3>
                                <p className="text-sm text-muted-foreground">Gestiona la lista de precios y productos de proveedores.</p>
                            </div>
                            <Button asChild variant="secondary"><Link href="/book/ingredientes-erp">Gestionar</Link></Button>
                        </CardContent>
                    </Card>
                     <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold flex items-center gap-2"><ChefHat />Ingredientes Internos</h3>
                                <p className="text-sm text-muted-foreground">Vincula materia prima y gestiona alérgenos y mermas.</p>
                            </div>
                            <Button asChild variant="secondary"><Link href="/book/ingredientes">Gestionar</Link></Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}
