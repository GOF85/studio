'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress?: number; // 0-100, undefined for indeterminate
  className?: string;
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (progress !== undefined) {
      setWidth(progress);
    }
  }, [progress]);

  return (
    <div className={cn("fixed top-0 left-0 right-0 z-50 h-1 bg-transparent", className)}>
      <div
        className={cn(
          "h-full bg-primary transition-all duration-300 ease-out",
          progress === undefined && "animate-pulse bg-gradient-to-r from-primary via-primary/60 to-primary"
        )}
        style={{
          width: progress !== undefined ? `${width}%` : '100%',
          transition: progress !== undefined ? 'width 300ms ease-out' : 'none'
        }}
      />
    </div>
  );
}
