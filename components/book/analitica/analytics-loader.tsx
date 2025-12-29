'use client';

import { BarChart3, Loader2 } from 'lucide-react';

interface AnalyticsLoaderProps {
  isLoading: boolean;
  message: string;
}

export function AnalyticsLoader({ isLoading, message }: AnalyticsLoaderProps) {
  // Si no está cargando, no renderizamos nada (null)
  if (!isLoading) return null;

  return (
    <div className="relative">
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300">
        <div className="w-full max-w-md p-6 mx-4 bg-card border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          
          {/* Cabecera Visual */}
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              {/* Círculos pulsantes decorativos */}
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
              <div className="relative bg-emerald-50 p-4 rounded-full border border-emerald-100">
                <BarChart3 className="w-8 h-8 text-emerald-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                Analizando Datos
              </h3>
              
              {/* Mensaje Verbose Dinámico */}
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground min-h-[1.5rem]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span className="animate-pulse">{message || 'Preparando entorno...'}</span>
              </div>
            </div>
          </div>

          {/* Barra de Progreso Indeterminada (Simulada con pulse si no tienes animaciones custom) */}
          <div className="mt-6 h-1.5 w-full bg-muted overflow-hidden rounded-full">
            <div className="h-full bg-emerald-500 w-1/2 animate-pulse rounded-full mx-auto" />
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground mt-3 opacity-70">
              Esto puede tomar unos segundos dependiendo del volumen de datos históricos.
          </p>
        </div>
      </div>
    </div>
  );
}