'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableRow } from '@/components/ui/table';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto',
  };
  
  // Pass listeners to a specific drag handle
  const childrenWithDragHandle = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && typeof child.type !== 'string') {
        // @ts-ignore
        return React.cloneElement(child, { dragHandleProps: { ...attributes, ...listeners } });
    }
    return child;
  });

  return (
    <TableRow ref={setNodeRef} style={style}>
      {childrenWithDragHandle}
    </TableRow>
  );
}
