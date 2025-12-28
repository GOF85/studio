'use client';

import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncProgressDialogProps {
  isOpen: boolean;
  logs: string[];
  progress: number;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  onClose: () => void;
}

export function SyncProgressDialog({
  isOpen,
  logs,
  progress,
  status,
  onClose,
}: SyncProgressDialogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && status !== 'syncing' && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2 rounded-xl",
              status === 'syncing' ? "bg-primary/10 text-primary animate-spin" :
              status === 'completed' ? "bg-green-500/10 text-green-500" :
              status === 'error' ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
            )}>
              {status === 'syncing' && <RefreshCw className="h-5 w-5" />}
              {status === 'completed' && <CheckCircle2 className="h-5 w-5" />}
              {status === 'error' && <AlertCircle className="h-5 w-5" />}
            </div>
            <DialogTitle className="text-xl font-black tracking-tight">
              {status === 'syncing' ? 'Sincronizando con ERP' : 
               status === 'completed' ? 'Sincronización Finalizada' :
               status === 'error' ? 'Error en Sincronización' : 'Sincronización'}
            </DialogTitle>
          </div>
          <DialogDescription className="font-medium">
            {status === 'syncing' ? 'Actualizando precios y categorías desde el maestro del ERP...' : 
             status === 'completed' ? 'Todos los artículos han sido actualizados correctamente.' :
             status === 'error' ? 'Se produjo un error durante el proceso.' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground/60">
              <span>Progreso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 rounded-full bg-primary/10" />
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/40 overflow-hidden">
            <div className="px-4 py-2 border-b border-border/40 bg-muted/30 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Registro de actividad</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                <div className="w-2 h-2 rounded-full bg-green-500/20" />
              </div>
            </div>
            <ScrollArea className="h-[200px] w-full p-4" ref={scrollRef}>
              <div className="space-y-1.5">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 text-[11px] font-medium leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-muted-foreground/30 font-mono">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                    <span className={cn(
                      "flex-1",
                      log.includes('Error') ? "text-destructive" : 
                      log.includes('finalizada') ? "text-green-500 font-bold" : "text-foreground/80"
                    )}>
                      {log}
                    </span>
                  </div>
                ))}
                {status === 'syncing' && (
                  <div className="flex gap-3 text-[11px] font-medium animate-pulse">
                    <span className="text-muted-foreground/30 font-mono">[...]</span>
                    <span className="text-primary">Procesando...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {status !== 'syncing' && (
          <div className="flex justify-end mt-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              Cerrar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
