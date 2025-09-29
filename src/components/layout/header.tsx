import Link from 'next/link';
import { UtensilsCrossed, Package, Truck, LifeBuoy } from 'lucide-react';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const isEntregasModule = pathname.startsWith('/entregas');
  const isPortalModule = pathname.startsWith('/portal');

  if (isEntregasModule) {
    return (
       <header className="sticky top-0 z-40 w-full border-b bg-orange-500 text-white">
        <div className="container flex h-16 items-center">
          <Link href="/entregas" className="flex items-center gap-3">
            <Package className="h-7 w-7" />
            <h1 className="text-2xl font-headline font-bold tracking-tight">
              Entregas MICE
            </h1>
          </Link>
        </div>
      </header>
    )
  }
  
  if (isPortalModule) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-3">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">
            MICE Catering
          </h1>
        </Link>
        <nav className="flex flex-1 items-center justify-end space-x-2">
            <Button asChild variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
              <Link href="/entregas">
                <Package className="mr-2 h-5 w-5"/>
                Entregas MICE
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/docs">
                <LifeBuoy className="mr-2 h-5 w-5" />
                Documentación
              </Link>
            </Button>
        </nav>
      </div>
    </header>
  );
}
