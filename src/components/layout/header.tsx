'use client';

import Link from 'next/link';
import { UtensilsCrossed, FileText, ClipboardList, Database, Menu, Calendar, Trash2, Flower2, Target, BookHeart, Factory, LifeBuoy, FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-3">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">
            CateringStock
          </h1>
        </Link>
        <nav className="flex flex-1 items-center justify-end space-x-2">
           <Button variant="ghost" asChild>
            <Link href="/pes">
              <ClipboardList className="mr-2" />
              Previsión de Servicios
            </Link>
          </Button>
           <Button variant="ghost" asChild>
            <Link href="/calendario">
              <Calendar className="mr-2" />
              Calendario
            </Link>
          </Button>
           <Button variant="ghost" asChild>
                <Link href="/book">
                  <BookHeart className="mr-2" />
                  Book Gastronómico
                </Link>
              </Button>
            <Button variant="ghost" asChild>
                <Link href="/cpr">
                  <Factory className="mr-2" />
                  Producción (CPR)
                </Link>
              </Button>
             <Button variant="ghost" asChild>
                <Link href="/docs">
                  <LifeBuoy className="mr-2" />
                  Documentación
                </Link>
              </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/bd">
                  <Database className="mr-2" />
                  Bases de Datos
                </Link>
              </DropdownMenuItem>
               <DropdownMenuItem asChild>
                <Link href="/objetivos-gasto">
                  <Target className="mr-2" />
                  Objetivos de Gasto
                </Link>
              </DropdownMenuItem>
               <DropdownMenuItem asChild>
                <Link href="/plantillas-pedidos">
                  <FilePlus2 className="mr-2" />
                  Plantillas de Pedidos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/bd/borrar" className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2" />
                  Borrar Bases de Datos
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
