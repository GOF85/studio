'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
    BookHeart, Component, ChefHat, Search
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
// FIX: Importar DialogTitle para accesibilidad
import { DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';
import { cn } from '@/lib/utils';

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Cargamos los datos (React Query los cacheará, así que es rápido)
  const { data: recetas = [] } = useRecetas();
  const { data: elaboraciones = [] } = useElaboraciones();

  // Escuchar atajo de teclado (Cmd+K o Ctrl+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      {/* TRIGGER DEL BUSCADOR */}
      <Button
        variant="outline"
        className={cn(
          "relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-80 h-9 bg-muted/20 border-muted-foreground/20 hover:bg-muted/40 shadow-none"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar en el Book...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-[50%] -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* MODAL DE BÚSQUEDA (Spotlight) */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* FIX: Título requerido por accesibilidad, oculto visualmente */}
        <DialogTitle className="sr-only">Buscador Global</DialogTitle>
        
        <CommandInput placeholder="Escribe para buscar recetas, elaboraciones..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          
          {/* GRUPO: RECETAS */}
          <CommandGroup heading="Recetas">
            {recetas.slice(0, 5).map((receta) => (
                <CommandItem
                    key={receta.id}
                    value={`receta ${receta.nombre}`}
                    onSelect={() => runCommand(() => router.push(`/book/recetas/${receta.id}`))}
                >
                    <BookHeart className="mr-2 h-4 w-4 text-green-600" />
                    <span>{receta.nombre}</span>
                    {receta.isArchived && <span className="ml-2 text-[10px] text-muted-foreground">(Archivada)</span>}
                </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* GRUPO: ELABORACIONES */}
          <CommandGroup heading="Elaboraciones">
            {elaboraciones.slice(0, 5).map((elab) => (
                <CommandItem
                    key={elab.id}
                    value={`elaboracion ${elab.nombre}`}
                    onSelect={() => runCommand(() => router.push(`/book/elaboraciones/${elab.id}`))}
                >
                    <Component className="mr-2 h-4 w-4 text-blue-500" />
                    <span>{elab.nombre}</span>
                </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* GRUPO: NAVEGACIÓN RÁPIDA */}
          <CommandGroup heading="Navegación Rápida">
            <CommandItem onSelect={() => runCommand(() => router.push('/book/recetas/nueva'))}>
              <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                <span className="text-xs">+</span>
              </div>
              <span>Nueva Receta</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/book/elaboraciones/nueva'))}>
              <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                <span className="text-xs">+</span>
              </div>
              <span>Nueva Elaboración</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/book/ingredientes'))}>
              <ChefHat className="mr-2 h-4 w-4" />
              <span>Ir a Ingredientes</span>
            </CommandItem>
          </CommandGroup>

        </CommandList>
      </CommandDialog>
    </>
  );
}