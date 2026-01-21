'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ControlPanelCard } from './ControlPanelCard';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableCardProps {
  id: string;
  domId?: string;
  title: string;
  icon: any;
  children: React.ReactNode;
  badge?: string;
  badgeVariant?: any;
  onClick?: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export function SortableCard({ 
  id, 
  domId,
  title, 
  icon, 
  children, 
  badge, 
  badgeVariant,
  onClick,
  className,
  isCollapsed,
  onToggleCollapse
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group" id={domId}>
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-3 left-3 z-20 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded text-slate-400"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <ControlPanelCard
        title={title}
        icon={icon}
        badge={badge}
        badgeVariant={badgeVariant}
        onClick={onClick}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        className={cn(className, isDragging && "border-primary/50 shadow-lg")}
      >
        {children}
      </ControlPanelCard>
    </div>
  );
}
