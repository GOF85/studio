'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';


interface ProgressBarProps {
  progress?: number; // 0-100, undefined for indeterminate
  className?: string;
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (progress !== undefined) {
      setWidth(progress);
      setVisible(true);
      if (progress >= 100) {
        // Oculta la barra tras una breve transición
        const timeout = setTimeout(() => setVisible(false), 400);
        return () => clearTimeout(timeout);
      }
    }
  }, [progress]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "w-full h-1.5 bg-secondary/60 overflow-hidden",
        className
      )}
      role="progressbar"
      aria-valuenow={progress ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Cargando"
    >
      <div
        className={cn(
          "h-full bg-primary transition-all duration-300 ease-out",
          progress === undefined && "animate-pulse bg-gradient-to-r from-primary via-primary/60 to-primary"
        )}
        style={{
          width: progress !== undefined ? `${width}%` : '100%',
          transition: progress !== undefined ? 'width 300ms cubic-bezier(.4,1,.7,1)' : 'none'
        }}
      />
    </div>
  );
}
