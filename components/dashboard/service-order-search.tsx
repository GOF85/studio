'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Loader2, AlertCircle } from 'lucide-react';
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
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  // Función para cargar datos (iniciales o búsqueda)
  const fetchOrders = async (query: string = '') => {
    setLoading(true);
    try {
        let dbQuery = supabase
            .from('eventos')
            .select('id, numero_expediente, nombre_evento, fecha_inicio, estado')
            .order('fecha_inicio', { ascending: false })
            .limit(20);

        if (query) {
            dbQuery = dbQuery.or(`numero_expediente.ilike.%${query}%,nombre_evento.ilike.%${query}%`);
        }

        const { data, error } = await dbQuery;
        
        if (error) throw error;
        if (data) setResults(data);
    } catch (error) {
        console.error("Error buscando servicios:", error);
    } finally {
        setLoading(false);
    }
  };

  // Cargar inicial al abrir
  React.useEffect(() => {
    if (open) {
        fetchOrders();
    }
  }, [open]);

  // Atajo de teclado Cmd+K
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
        <span className="hidden sm:inline-flex">Buscar servicio (OS)...</span>
        <span className="inline-flex sm:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-2 top-[50%] -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog 
        open={open} 
        onOpenChange={setOpen}
      >
        <DialogTitle className="sr-only">Buscar Orden de Servicio</DialogTitle>
        
        <CommandInput 
            placeholder="Escribe Nº expediente o nombre..." 
            onValueChange={(val) => fetchOrders(val)}
        />
        
        <CommandList className="min-h-[300px]">
          {loading ? (
             <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" /> 
                <span>Buscando servicios...</span>
             </div>
          ) : results.length === 0 ? (
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
               No se encontraron servicios.
            </CommandEmpty>
          ) : (
            <CommandGroup heading="Resultados">
                {results.map((os) => (
                <CommandItem
                    key={os.id}
                    value={`${os.numero_expediente} ${os.nombre_evento}`}
                    onSelect={() => runCommand(() => router.push(`/os/${os.id}`))}
                    className="cursor-pointer aria-selected:bg-accent"
                >
                    <FileText className="mr-3 h-4 w-4 text-blue-500 shrink-0" />
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{os.numero_expediente} <span className="text-muted-foreground font-normal">- {os.nombre_evento}</span></span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                            {new Date(os.fecha_inicio).toLocaleDateString()} • <span className={cn(os.estado === 'CONFIRMADO' ? 'text-green-600' : 'text-amber-600')}>{os.estado}</span>
                        </span>
                    </div>
                </CommandItem>
                ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}