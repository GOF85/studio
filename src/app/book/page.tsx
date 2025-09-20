'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookHeart, ChefHat, Component, PlusCircle, Search, Package, GlassWater } from 'lucide-react';
import type { Receta } from '@/types';
import { Input } from '@/components/ui/input';

export default function BookDashboardPage() {
  const [allRecipes, setAllRecipes] = useState<Receta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedRecipes = localStorage.getItem('recetas');
    if (storedRecipes) {
      const parsedRecipes: Receta[] = JSON.parse(storedRecipes);
      // Simulating update times for sorting, in a real app this would be a property
      const recipesWithDate = parsedRecipes.map(r => ({ ...r, updatedAt: new Date() }));
      setAllRecipes(recipesWithDate.sort((a,b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)));
    }
    
    setIsMounted(true);
  }, []);

  const filteredRecipes = useMemo(() => {
    if (!searchTerm) {
      return allRecipes.slice(0, 5); // Show 5 most recent if no search term
    }
    return allRecipes.filter(recipe => 
        recipe.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.categoria || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [allRecipes, searchTerm]);


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-headline font-bold flex items-center gap-3"><BookHeart size={24}/>Book Gastronómico</h1>
            <Button asChild>
                <Link href="/book/recetas/nueva"><PlusCircle size={16}/> Nueva Receta</Link>
            </Button>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Button asChild variant="outline" className="justify-start h-12 text-base">
                <Link href="/book/elaboraciones"><Component size={18}/>Elaboraciones</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-12 text-base">
                <Link href="/book/ingredientes"><ChefHat size={18}/>Ingredientes</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-12 text-base">
                <Link href="/book/ingredientes-erp"><Package size={18}/>Materia Prima (ERP)</Link>
            </Button>
             <Button asChild variant="outline" className="justify-start h-12 text-base">
                <Link href="/menaje-db"><GlassWater size={18}/>Menaje</Link>
            </Button>
        </div>
        
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Buscar recetas por nombre o categoría..."
                className="w-full pl-10 h-11 text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div>
            <Card>
                <CardContent className="p-3">
                {filteredRecipes.length > 0 ? (
                    <ul className="space-y-2">
                    {filteredRecipes.map((recipe) => (
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
                        <p>{searchTerm ? 'No se encontraron recetas con ese criterio.' : 'Aún no se ha creado ninguna receta.'}</p>
                       {!searchTerm && <p className="text-sm">¡Crea tu primera receta para verla aquí!</p>}
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
