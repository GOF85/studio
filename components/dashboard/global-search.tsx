'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BookHeart, Component, ChefHat, Search } from 'lucide-react';

// USAMOS PRIMITIVOS SEPARADOS (Opción Robusta)
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';
import { cn } from '@/lib/utils';

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const { data: recetas = [] } = useRecetas();
  const { data: elaboraciones = [] } = useElaboraciones();

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
      <Button
        variant="outline"
        className={cn(
          "relative w-full justify-start text-sm text-muted-foreground h-10 bg-background border-input hover:bg-accent hover:text-accent-foreground shadow-sm px-4"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar en el Book...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-2 top-[50%] -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* AQUÍ ESTÁ LA CLAVE DE LA ROBUSTEZ:
          Usamos DialogContent directamente para controlar dimensiones (max-w-4xl, h-[60vh])
      */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-4xl h-[60vh] flex flex-col shadow-2xl">
            <DialogTitle className="sr-only">Buscador Global</DialogTitle>
            
            <Command className="w-full h-full [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
                <CommandInput 
                    placeholder="Escribe para buscar recetas, elaboraciones..." 
                    className="h-14 text-lg border-none focus:ring-0" 
                />
                <CommandList className="max-h-full flex-1 overflow-y-auto p-2">
                    <CommandEmpty className="py-6 text-center text-sm">No se encontraron resultados.</CommandEmpty>
                    
                    <CommandGroup heading="Recetas">
                        {recetas.slice(0, 5).map((receta) => (
                            <CommandItem
                                key={receta.id}
                                value={`receta ${receta.nombre}`}
                                onSelect={() => runCommand(() => router.push(`/book/recetas/${receta.id}`))}
                                className="cursor-pointer"
                            >
                                <BookHeart className="mr-2 h-4 w-4 text-green-600" />
                                <span className="text-base">{receta.nombre}</span>
                                {receta.isArchived && <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">(Archivada)</span>}
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator className="my-2" />

                    <CommandGroup heading="Elaboraciones">
                        {elaboraciones.slice(0, 5).map((elab) => (
                            <CommandItem
                                key={elab.id}
                                value={`elaboracion ${elab.nombre}`}
                                onSelect={() => runCommand(() => router.push(`/book/elaboraciones/${elab.id}`))}
                                className="cursor-pointer"
                            >
                                <Component className="mr-2 h-4 w-4 text-blue-500" />
                                <span className="text-base">{elab.nombre}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator className="my-2" />

                    <CommandGroup heading="Navegación Rápida">
                        <CommandItem onSelect={() => runCommand(() => router.push('/book/recetas/nueva'))} className="cursor-pointer">
                            <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-sm border border-primary bg-primary/10">
                                <span className="text-xs text-primary">+</span>
                            </div>
                            <span className="font-medium">Nueva Receta</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/book/elaboraciones/nueva'))} className="cursor-pointer">
                            <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-sm border border-primary bg-primary/10">
                                <span className="text-xs text-primary">+</span>
                            </div>
                            <span className="font-medium">Nueva Elaboración</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/book/ingredientes'))} className="cursor-pointer">
                            <ChefHat className="mr-2 h-5 w-5" />
                            <span className="font-medium">Ir a Ingredientes</span>
                        </CommandItem>
                    </CommandGroup>

                </CommandList>
            </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}