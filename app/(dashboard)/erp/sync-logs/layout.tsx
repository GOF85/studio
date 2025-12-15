'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Database, Menu, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function SyncLogsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* BREADCRUMBS STICKY (Patrón de la app) */}
      <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 py-2 text-sm font-semibold">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-2 md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5" />
                    Sincronización
                  </SheetTitle>
                </SheetHeader>
                <nav className="grid items-start gap-1 p-4">
                  <Link
                    href="/bd/erp"
                    className="group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    <span>← Volver a Artículos ERP</span>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Breadcrumb Desktop */}
            <Link href="/bd" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <Database className="h-5 w-5" />
              <span>Bases de datos</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href="/bd/erp" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <span>Artículos ERP</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold text-primary">Logs de Sincronización</span>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      {children}
    </>
  );
}
