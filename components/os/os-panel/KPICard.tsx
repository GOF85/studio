'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  variant?: 'amber' | 'blue' | 'emerald' | 'slate';
}

const variants = {
  amber: 'bg-amber-50 border-amber-100 text-amber-700',
  blue: 'bg-blue-50 border-blue-100 text-blue-700',
  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  slate: 'bg-slate-50 border-slate-100 text-slate-700',
};

export function KPICard({ 
  label, 
  value, 
  icon, 
  subtitle, 
  className,
  variant = 'slate' 
}: KPICardProps) {
  return (
    <Card className={cn("border shadow-none overflow-hidden", variants[variant], className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-bold uppercase tracking-tighter opacity-70 italic whitespace-nowrap">{label}</span>
          {icon && <div className="opacity-50">{icon}</div>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black">{value}</span>
          {subtitle && <span className="text-[10px] font-medium opacity-60">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
