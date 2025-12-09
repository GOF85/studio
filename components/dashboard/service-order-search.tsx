'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Calendar, Search, FileText } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Tipo simple para resultados de búsqueda
type SearchResult = {
    id: string;
    numero_expediente: string;
    nombre_evento: string;
    fecha_inicio: string;
    estado: string;
};

export function ServiceOrderSearch() {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const router = useRouter();

  // Cargar datos al abrir el modal (o podrías usar useQuery para cachear)
  React.useEffect(() => {
    if (open) {
        const fetchOrders = async () => {
            const { data } = await supabase
                .from('eventos')
                .select('id, numero_expediente, nombre_evento, fecha_inicio, estado')
                .order('fecha_inicio', { ascending: false })
                .limit(50); // Limitar a los últimos 50 para rapidez inicial
            
            if (data) setResults(data);
        };
        fetchOrders();
    }
  }, [open]);

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
          "relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-80 h-9 bg-background border-input hover:bg-accent hover:text-accent-foreground shadow-sm"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar servicio (OS)...</span>
        <span className="inline-flex lg:hidden">Buscar OS...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-[50%] -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Buscar Orden de Servicio</DialogTitle>
        <CommandInput placeholder="Escribe Nº expediente, cliente o nombre..." />
        <CommandList>
          <CommandEmpty>No se encontraron servicios.</CommandEmpty>
          <CommandGroup heading="Servicios Recientes">
            {results.map((os) => (
              <CommandItem
                key={os.id}
                value={`${os.numero_expediente} ${os.nombre_evento}`}
                onSelect={() => runCommand(() => router.push(`/os/${os.id}`))}
              >
                <FileText className="mr-2 h-4 w-4 text-blue-500" />
                <div className="flex flex-col">
                    <span className="font-medium">{os.numero_expediente} - {os.nombre_evento}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {new Date(os.fecha_inicio).toLocaleDateString()} • {os.estado}
                    </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}