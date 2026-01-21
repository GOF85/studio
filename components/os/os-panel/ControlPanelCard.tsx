'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ControlPanelCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'amber' | 'emerald' | 'blue' | 'orange';
  onClick?: () => void;
  headerRight?: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  domId?: string;
}

const badgeVariants = {
  default: 'bg-slate-100 text-slate-800',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
};

export function ControlPanelCard({
  title,
  icon: Icon,
  children,
  className,
  badge,
  badgeVariant = 'default',
  onClick,
  headerRight,
  isCollapsed,
  onToggleCollapse,
  domId,
}: ControlPanelCardProps) {
  return (
    <Card 
      id={domId}
      className={cn(
        "overflow-hidden transition-all duration-200 border-slate-200 shadow-sm hover:shadow-md",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <CardTitle className="text-sm font-semibold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            {title}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {headerRight}
          {badge !== undefined && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              badgeVariants[badgeVariant]
            )}>
              {badge}
            </span>
          )}
          {onToggleCollapse && (
            <button 
              onClick={() => onToggleCollapse(!isCollapsed)}
              className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={cn("transition-transform duration-200", isCollapsed && "rotate-180")}
              >
                <path d="m18 15-6-6-6 6"/>
              </svg>
            </button>
          )}
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="pt-4 px-4 pb-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
