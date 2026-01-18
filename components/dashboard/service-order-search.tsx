'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Loader2, AlertCircle, Star, Calendar, Users, MapPin, Hotel } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDebounce } from '@/hooks/use-debounce';

type SearchResult = {
  id: string;
  numero_expediente: string;
  client: string;
  final_client: string;
  space: string;
  start_date: string;
  status: string;
  is_vip?: boolean;
};

export function ServiceOrderSearch() {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();

  // Función para cargar datos (iniciales o búsqueda)
  const fetchOrders = async (query: string = '') => {
    setLoading(true);
    try {
      const limit = query ? 10 : 5;
      let dbQuery = supabase
        .from('eventos')
        .select('id, numero_expediente, client, final_client, space, start_date, status, is_vip')
        .limit(limit);

      if (query) {
        dbQuery = dbQuery.or(`numero_expediente.ilike.%${query}%,client.ilike.%${query}%,space.ilike.%${query}%,final_client.ilike.%${query}%`);
        dbQuery = dbQuery.order('start_date', { ascending: false });
      } else {
        dbQuery = dbQuery.order('start_date', { ascending: false });
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      
      if (data) {
        let sortedResults = (data as unknown as SearchResult[]);
        
        // Si no hay búsqueda, ordenar por cercanía (Hoy -> Futuro -> Pasado)
        if (!query) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          
          sortedResults = [...sortedResults].sort((a, b) => {
            const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
            const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
            
            const isAPast = dateA < now;
            const isBPast = dateB < now;

            if (!isAPast && isBPast) return -1;
            if (isAPast && !isBPast) return 1;

            if (!isAPast) {
              return dateA.getTime() - dateB.getTime(); // Ascendente futuro (más cercano primero)
            } else {
              return dateB.getTime() - dateA.getTime(); // Descendente pasado (más reciente primero)
            }
          });
        }
        
        setResults(sortedResults);
      }
    } catch (error) {
      console.error("Error buscando servicios:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar cuando cambia la búsqueda debounced o al abrir
  React.useEffect(() => {
    if (open) {
      fetchOrders(debouncedQuery);
    }
  }, [open, debouncedQuery]);

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
        <DialogDescription className="sr-only">
          Busca y selecciona una orden de servicio por número de expediente, cliente o espacio.
        </DialogDescription>

        <CommandInput
          placeholder="Escribe Nº expediente, cliente o espacio..."
          onValueChange={setQuery}
          className="border-none focus:ring-0"
        />

        <CommandList className="min-h-[200px] bg-background">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
            </div>
          ) : results.length === 0 ? (
            <CommandEmpty className="py-12 text-center text-sm text-muted-foreground">
              No se encontraron resultados.
            </CommandEmpty>
          ) : (
            <CommandGroup heading="Resultados">
              {results.map((os) => (
                <CommandItem
                  key={os.id}
                  value={`${os.numero_expediente} ${os.client} ${os.space} ${os.final_client}`}
                  onSelect={() => runCommand(() => router.push(`/os/${os.numero_expediente}`))}
                  className="cursor-pointer aria-selected:bg-accent px-4 py-3"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {os.is_vip && (
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      <span className="font-bold text-sm tracking-tight truncate text-black">
                        {os.numero_expediente}
                        <span className="text-muted-foreground font-normal ml-2">
                          - <Hotel className="inline h-3.5 w-3.5 mr-1" /> {os.space || 'Sin espacio'} - {os.final_client || os.client}
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <Calendar className="h-3 w-3 opacity-50" />
                      {os.start_date ? format(new Date(os.start_date), "d MMM yyyy", { locale: es }) : 'Sin fecha'}
                      <span className="opacity-30 mx-1">•</span>
                      <span className={cn(
                        "font-medium",
                        os.status?.toUpperCase() === 'CONFIRMADO' 
                          ? 'text-emerald-600' 
                          : 'text-amber-600'
                      )}>
                        {os.status}
                      </span>
                    </div>
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