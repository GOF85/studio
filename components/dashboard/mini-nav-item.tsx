'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type MenuItem } from '@/lib/nav-config';

export const MiniNavItem = React.memo(function MiniNavItem({ item }: { item: MenuItem }) {
    return (
        <Link href={item.href} className="group/item flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-transparent hover:border-border/40 hover:bg-background/80 hover:shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary transition-all duration-300">
                    <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-foreground/70 group-hover/item:text-foreground truncate tracking-tight">
                    {item.title}
                </span>
            </div>
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-muted/30 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all duration-300">
                <ChevronRight className="w-3 h-3 text-primary" />
            </div>
        </Link>
    );
});
