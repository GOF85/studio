'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileSheetEditorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function MobileSheetEditor({
  isOpen,
  onClose,
  title,
  children,
}: MobileSheetEditorProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[600px] px-0 pb-0 rounded-t-xl overflow-hidden">
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-2 mb-4 shrink-0" />
        <SheetHeader className="px-6 pb-2 text-left">
          <SheetTitle className="text-lg font-bold text-slate-900">{title}</SheetTitle>
          <SheetDescription className="text-xs">
            Actualiza la información de la sección. Los cambios se guardan automáticamente.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 h-full px-6 py-4">
          <div className="pb-12">
            {children}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
