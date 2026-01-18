"use client";

import React, { useId } from 'react';
import Link from 'next/link';
import { ClipboardList, FileText, ReceiptEuro, Utensils, Snowflake, Warehouse, Boxes, Flower, Blocks, Users, User, Truck, Package, BookCheck, Wine } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { useEvento } from '@/hooks/use-data-queries';

export default function OsModulesDialog({ 
  osId, 
  numeroExpediente,
  triggerClassName, 
  trigger 
}: { 
  osId: string; 
  numeroExpediente?: string;
  triggerClassName?: string; 
  trigger?: React.ReactNode 
}) {
  const { data: evento } = useEvento(osId);
  const reactId = useId();
  const contentId = `os-modules-${osId}-${reactId}`;

  // Se usa numeroExpediente pasado por prop, sino serviceNumber del evento, sino osId
  const displayId = numeroExpediente || evento?.serviceNumber || osId;

  const menu = [
    { key: 'sep1', separator: true },

    { key: 'info', title: 'Info', icon: ClipboardList },
    { key: 'comercial', title: 'Comercial', icon: ReceiptEuro },
    { key: 'cta-explotacion', title: 'Cuenta explotación', icon: FileText },
    { key: 'sep2', separator: true },

    { key: 'gastronomia', title: 'Gastronomía', icon: Utensils },
    { key: 'bodega', title: 'Bodega', icon: Wine },
    { key: 'hielo', title: 'Hielo', icon: Snowflake },
    { key: 'almacen', title: 'Almacén', icon: Warehouse },
    { key: 'alquiler', title: 'Alquiler', icon: Boxes },
    { key: 'decoracion', title: 'Decoración', icon: Flower },
    { key: 'atipicos', title: 'Atípicos', icon: Blocks },
    { key: 'personal-mice', title: 'Personal MICE', icon: User },
    { key: 'personal-externo', title: 'Personal externo', icon: Users },
    { key: 'transporte', title: 'Transporte', icon: Truck },
    { key: 'sep3', separator: true },

    { key: 'logistica', title: 'Logística', icon: Package },
    { key: 'sep4', separator: true },

    { key: 'prueba-menu', title: 'Prueba Menú', icon: BookCheck },
  ];

  const filteredMenu = menu.filter((item, index) => {
    if ((item as any).separator && index === 0) return false;
    return true;
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button className={triggerClassName || 'inline-flex items-center gap-2 px-3 py-2 rounded-md bg-muted/20 hover:bg-muted'}>
            Módulos
          </button>
        )}
      </SheetTrigger>

      <SheetContent id={contentId} side="left" className="w-80 h-full p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-2 py-6 border-b">
            <div className="flex items-center justify-between">
              <SheetClose asChild>
                <Link 
                  href={`/os/${displayId}/control-panel`}
                  className="w-full flex items-center px-4 py-3 rounded-xl hover:bg-emerald-500/10 transition-colors group"
                >
                  <SheetTitle className="text-3xl font-black tracking-tighter text-emerald-900">
                    {`OS ${displayId}`}
                  </SheetTitle>
                </Link>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto px-4 py-2">
            <div className="space-y-1">
              {filteredMenu.map(item => {
                if ((item as any).separator) return <div key={item.key} className="border-t border-border my-2" />;
                if ((item as any).isHeader) return null;

                const Icon = (item as any).icon;
                return (
                  <SheetClose asChild key={item.key}>
                    <Link href={`/os/${displayId}/${item.key}`} className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium hover:bg-emerald-500/10 text-emerald-900 transition-colors">
                      <Icon className="h-4 w-4 text-emerald-800" />
                      {item.title}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
