"use client";

import React, { useId } from 'react';
import Link from 'next/link';
import { ClipboardList, FileText, ReceiptEuro, Utensils, Snowflake, Warehouse, Boxes, Flower, Blocks, Users, User, Truck, Package, BookCheck, Wine } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { useEvento } from '@/hooks/use-data-queries';

export default function OsModulesDialog({ osId, triggerClassName, trigger }: { osId: string; triggerClassName?: string; trigger?: React.ReactNode }) {
  const { data: evento } = useEvento(osId);
  const reactId = useId();
  const contentId = `os-modules-${osId}-${reactId}`;

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
          <SheetHeader className="px-4 py-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">{`OS ${evento?.serviceNumber || osId}`}</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto px-4 py-2">
            <div className="space-y-2">
              {menu.map(item => {
                if ((item as any).separator) return <div key={item.key} className="border-t border-border my-2" />;
                if ((item as any).isHeader) return null;

                const Icon = (item as any).icon;
                return (
                  <SheetClose asChild key={item.key}>
                    <Link href={`/os/${osId}/${item.key}`} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent">
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
