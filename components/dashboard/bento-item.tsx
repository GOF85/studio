'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BentoItemProps {
    className?: string;
    children: React.ReactNode;
    href?: string;
    onClick?: (e: React.MouseEvent) => void;
    gradient?: string;
}

export const BentoItem = React.memo(function BentoItem({ className, children, href, onClick, gradient }: BentoItemProps) {
    const Content = (
        <div 
            onClick={onClick}
            className={cn(
                "relative h-full w-full overflow-hidden rounded-2xl border border-border/40 bg-card/60 text-card-foreground shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:border-primary/30 hover:-translate-y-1 group",
                href || onClick ? "cursor-pointer" : "",
                gradient,
                className
            )}
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />
            {children}
        </div>
    );
    if (href) return <Link href={href} className={cn("block h-full w-full transition-transform active:scale-[0.98]", className)}>{Content}</Link>;
    return Content;
});
