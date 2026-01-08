'use client';

import { 
  Users, 
  Star, 
  History 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WorkerHistoryPopoverProps {
  stats: {
    averageRating: number;
    totalServices: number;
    history: Array<{
      osId: string;
      eventoNombre: string;
      fecha: string;
      rating: number;
      comentario: string;
    }>;
  };
  trigger?: React.ReactNode;
}

export function WorkerHistoryPopover({ stats, trigger }: WorkerHistoryPopoverProps) {
  if (!stats?.history || stats.history.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50 text-blue-600 transition-all">
            <History className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-border/40 overflow-hidden" align="end">
        <div className="bg-blue-600 p-4 text-white">
          <h4 className="font-black uppercase tracking-tighter text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Historial de Servicios
          </h4>
          <p className="text-[10px] opacity-80 mt-1 font-bold uppercase tracking-widest">
            {stats.totalServices} Servicios realizados en total
          </p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {stats.history.map((h: any, i: number) => (
            <div key={i} className="p-4 border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-0.5" style={{ maxWidth: '75%' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {format(new Date(h.fecha), 'dd MMMM yyyy', { locale: es })}
                  </p>
                  <p className="text-xs font-bold leading-tight uppercase line-clamp-2">{h.eventoNombre}</p>
                </div>
                <div className="flex items-center bg-yellow-400/10 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-400/20">
                   <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 mr-1" />
                   <span className="text-[10px] font-black">{h.rating || '-'}</span>
                </div>
              </div>
              {h.comentario && (
                <div className="bg-muted/50 p-2 rounded-lg border border-border/40 italic text-[11px] text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
                  "{h.comentario}"
                </div>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
