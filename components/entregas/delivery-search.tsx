'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

type SearchResult = {
  id: string;
  numero_expediente: string;
  nombre_evento: string;
  fecha_inicio: string;
  estado: string;
};

export function DeliverySearch() {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const fetchDeliveries = async (query: string = '') => {
    setLoading(true);
    try {
      let dbQuery = supabase
        .from('entregas')
        .select('id, numero_expediente, nombre_evento, fecha_inicio, estado')
        .order('fecha_inicio', { ascending: false })
        .limit(20);

      if (query) {
        dbQuery = dbQuery.or(`numero_expediente.ilike.%${query}%,nombre_evento.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      if (data) setResults(data as unknown as SearchResult[]);
    } catch (error) {
      console.error("Error buscando entregas:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      fetchDeliveries();
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
          "relative w-full justify-start text-sm text-muted-foreground h-10 bg-background border-input hover:bg-accent hover:text-accent-foreground shadow-sm px-4"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline-flex">Buscar entrega (Nº Pedido)...</span>
        <span className="inline-flex sm:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-2 top-[50%] -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Buscador de Entregas</DialogTitle>
        <DialogDescription className="sr-only">
          Busca por número de expediente o nombre del evento.
        </DialogDescription>
        <CommandInput 
          placeholder="Escribe para buscar..." 
          onValueChange={(v) => fetchDeliveries(v)}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Buscando...</span>
              </div>
            ) : (
              "No se encontraron resultados."
            )}
          </CommandEmpty>
          <CommandGroup heading="Entregas Recientes">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.numero_expediente} ${item.nombre_evento}`}
                onSelect={() => {
                  runCommand(() => router.push(`/entregas/pedido/${item.numero_expediente}`));
                }}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{item.numero_expediente}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{item.nombre_evento}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {format(new Date(item.fecha_inicio), 'dd/MM/yyyy')}
                  </span>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                    item.estado === 'CONFIRMADO' ? "bg-emerald-100 text-emerald-700" : 
                    item.estado === 'BORRADOR' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                  )}>
                    {item.estado}
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
