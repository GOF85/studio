'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, FileText } from 'lucide-react';

interface PDFGenerationSplashProps {
  isOpen: boolean;
  progress?: number;
  message?: string;
}

export function PDFGenerationSplash({
  isOpen,
  progress,
  message = 'Generando PDF...',
}: PDFGenerationSplashProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="max-w-sm bg-background/95 backdrop-blur-md border-border/40 flex flex-col items-center justify-center gap-6 p-8"
        showClose={false}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Logo Animation */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse" />
            <div className="relative z-10 p-4 rounded-full bg-blue-500/10 border-2 border-blue-500/30">
              <FileText className="w-8 h-8 text-blue-600 animate-bounce" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h3 className="text-lg font-black uppercase tracking-widest mb-2">
              Procesando Pedido
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              {message}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress || 0, 100)}%` }}
              />
            </div>
            {progress && (
              <p className="text-xs text-muted-foreground text-center font-mono">
                {Math.round(progress)}%
              </p>
            )}
          </div>

          {/* Loading Spinner */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="font-medium">Por favor espera...</span>
          </div>

          {/* Info Box */}
          <div className="w-full p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-600/80 text-center leading-relaxed">
              Este proceso puede tomar entre 5-10 segundos. No cierres esta ventana.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
