'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableRow } from '@/components/ui/table';

interface SortableItemProps {
  id: string;
  children: (
    listeners: ReturnType<typeof useSortable>['listeners'],
    attributes: ReturnType<typeof useSortable>['attributes']
  ) => React.ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto',
    position: 'relative', // Ensure zIndex works
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      {children(listeners, attributes)}
    </TableRow>
  );
}
