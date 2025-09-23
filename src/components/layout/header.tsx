import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';

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
        </nav>
      </div>
    </header>
  );
}
