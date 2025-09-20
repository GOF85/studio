'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookHeart, ChefHat, Component, PlusCircle, Search, Package, GlassWater } from 'lucide-react';
import type { Receta } from '@/types';
import { Input } from '@/components/ui/input';

export default function BookDashboardPage() {
  const [recentRecipes, setRecentRecipes] = useState<Receta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedRecipes = localStorage.getItem('recetas');
    if (storedRecipes) {
      const allRecipes: Receta[] = JSON.parse(storedRecipes);
      const recipesWithDate = allRecipes.map(r => ({ ...r, updatedAt: new Date() }));
      setRecentRecipes(recipesWithDate.sort((a,b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)).slice(0, 5));
    }
    
    setIsMounted(true);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><BookHeart size={28}/>Book Gastronómico</h1>
        </div>

        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Buscar recetas, elaboraciones o ingredientes..."
                className="w-full pl-10 h-11 text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-lg transition-shadow md:col-span-2">
                <CardContent className="p-4 flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold"><PlusCircle size={18}/> Nueva Receta</CardTitle>
                    <Button asChild>
                        <Link href="/book/recetas/nueva">Empezar a Crear</Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                 <CardContent className="p-4 flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold"><Component size={18}/>Elaboraciones</CardTitle>
                     <Button asChild variant="outline">
                        <Link href="/book/elaboraciones">Gestionar</Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold"><ChefHat size={18}/>Ingredientes</CardTitle>
                     <Button asChild variant="outline">
                        <Link href="/book/ingredientes">Gestionar</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h2 className="text-xl font-headline font-semibold mb-3">Últimas Recetas Modificadas</h2>
                <Card>
                    <CardContent className="p-3">
                    {recentRecipes.length > 0 ? (
                        <ul className="space-y-2">
                        {recentRecipes.map((recipe) => (
                            <li key={recipe.id} className="flex items-center justify-between pb-2 border-b last:border-0">
                            <div>
                                <Link href={`/book/recetas/${recipe.id}`} className="font-semibold text-primary hover:underline">{recipe.nombre}</Link>
                                <p className="text-sm text-muted-foreground">
                                    {recipe.categoria} - Por {recipe.responsableEscandallo || 'N/A'}
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
                <h2 className="text-xl font-headline font-semibold mb-3">Bases de Datos</h2>
                 <div className="space-y-3">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold flex items-center gap-2 text-base"><Package />Materia Prima (ERP)</h3>
                                <p className="text-sm text-muted-foreground">Precios y productos de proveedores.</p>
                            </div>
                            <Button asChild variant="secondary"><Link href="/book/ingredientes-erp">Gestionar</Link></Button>
                        </CardContent>
                    </Card>
                     <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold flex items-center gap-2 text-base"><GlassWater />Menaje</h3>
                                <p className="text-sm text-muted-foreground">Artículos para emplatados y servicio.</p>
                            </div>
                            <Button asChild variant="secondary"><Link href="/menaje-db">Gestionar</Link></Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}
